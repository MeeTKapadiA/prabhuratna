const db = require('../config/db');
const { getFinancialYear } = require('../utils/fyHelper');
const { roundMoney, processSaleItems } = require('../utils/saleItems');

const ALLOWED_PAYMENT_MODES = new Set(['CASH', 'UPI', 'CARD', 'MIXED', 'CREDIT']);

exports.createInvoice = (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      discount_amount: rawDiscountAmount,
      scrap_value: rawScrapValue,
      payment_mode,
      notes,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to generate invoice' });
    }

    const normalizedPaymentMode = String(payment_mode || '').toUpperCase();
    if (!ALLOWED_PAYMENT_MODES.has(normalizedPaymentMode)) {
      return res.status(400).json({ success: false, message: 'Payment mode is required' });
    }

    const { processedItems, finalSubtotal, finalTax } = processSaleItems(items);
    const requestedDiscount = Math.max(0, parseFloat(rawDiscountAmount) || 0);
    const finalDiscount = roundMoney(Math.min(requestedDiscount, finalSubtotal + finalTax));
    const finalScrap = roundMoney(Math.max(0, parseFloat(rawScrapValue) || 0));
    const finalGrandTotal = Math.max(0, roundMoney(finalSubtotal + finalTax - finalDiscount - finalScrap));

    if (!Number.isFinite(finalGrandTotal) || finalGrandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice grand total is invalid or ₹0. Please check items and pricing before proceeding.'
      });
    }

    // Execute in transaction (atomic & thread-safe)
    const transaction = db.transaction(() => {
      // Atomic sequential GST invoice number generation
      const fy = getFinancialYear();
      db.prepare(`
        INSERT INTO invoice_counters (financial_year, last_number)
        VALUES (?, 0)
        ON CONFLICT(financial_year) DO NOTHING
      `).run(fy);

      db.prepare(`
        UPDATE invoice_counters
        SET last_number = last_number + 1
        WHERE financial_year = ?
      `).run(fy);

      const counterRow = db.prepare('SELECT last_number FROM invoice_counters WHERE financial_year = ?').get(fy);
      const paddedNumber = String(counterRow.last_number).padStart(4, '0');
      const invoiceNumber = `INV/${fy}/${paddedNumber}`;

      // 1. Insert Invoice
      const invoiceStmt = db.prepare(`
        INSERT INTO invoices (
          invoice_number, customer_name, customer_phone, customer_email,
          subtotal, tax_amount, discount_amount, scrap_value, grand_total, payment_mode, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = invoiceStmt.run(
        invoiceNumber,
        customer_name || 'Walk-in Customer',
        customer_phone || '',
        customer_email || '',
        finalSubtotal,
        finalTax,
        finalDiscount,
        finalScrap,
        finalGrandTotal,
        normalizedPaymentMode,
        notes || ''
      );

      const invoiceId = result.lastInsertRowid;

      // 2. Insert Items & Update Stock
      const itemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, product_id, product_name, barcode, unit_price, quantity,
          discount_percent, gst_percent, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
      `);

      const logStmt = db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes)
        VALUES (?, 'SALE', ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        itemStmt.run(
          invoiceId,
          item.product_id || null,
          item.product_name,
          item.barcode || '',
          item.unit_price,
          item.quantity,
          item.discount_percent,
          item.gst_percent,
          item.total_price
        );

        if (item.product_id) {
          const prod = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
          if (prod) {
            const prevStock = prod.stock_quantity;
            const newStock = prevStock - item.quantity;
            if (newStock < 0) {
              const error = new Error(`Insufficient stock for ${item.product_name}`);
              error.statusCode = 400;
              throw error;
            }

            updateStockStmt.run(item.quantity, item.product_id);
            logStmt.run(item.product_id, -item.quantity, prevStock, newStock, `Sold in invoice ${invoiceNumber}`);
          }
        }
      }

      return invoiceId;
    });

    const invoiceId = transaction();

    // Fetch full invoice data
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: {
        ...invoice,
        items: invoiceItems
      }
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 400 ? error.message : 'Failed to create invoice'
    });
  }
};

exports.getAllInvoices = (req, res) => {
  try {
    const { search, payment_mode, startDate, endDate } = req.query;
    let query = `SELECT * FROM invoices WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (payment_mode) {
      query += ` AND payment_mode = ?`;
      params.push(payment_mode);
    }

    if (startDate) {
      query += ` AND DATE(created_at) >= DATE(?)`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(created_at) <= DATE(?)`;
      params.push(endDate);
    }

    query += ` ORDER BY id DESC`;

    const invoices = db.prepare(query).all(...params);
    return res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
};

exports.getInvoiceById = (req, res) => {
  try {
    const { id } = req.params;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?').get(id, id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
    return res.json({
      success: true,
      invoice: {
        ...invoice,
        items
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
};
