const db = require('../config/db');

exports.createInvoice = (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      subtotal,
      tax_amount,
      discount_amount,
      grand_total,
      payment_mode,
      notes,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to generate invoice' });
    }

    if (!payment_mode) {
      return res.status(400).json({ success: false, message: 'Payment mode is required' });
    }

    // Generate unique invoice number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;

    // Execute in transaction
    const transaction = db.transaction(() => {
      // 1. Insert Invoice
      const invoiceStmt = db.prepare(`
        INSERT INTO invoices (
          invoice_number, customer_name, customer_phone, customer_email,
          subtotal, tax_amount, discount_amount, grand_total, payment_mode, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = invoiceStmt.run(
        invoiceNumber,
        customer_name || 'Walk-in Customer',
        customer_phone || '',
        customer_email || '',
        parseFloat(subtotal) || 0,
        parseFloat(tax_amount) || 0,
        parseFloat(discount_amount) || 0,
        parseFloat(grand_total) || 0,
        payment_mode,
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

      for (const item of items) {
        itemStmt.run(
          invoiceId,
          item.product_id || null,
          item.product_name,
          item.barcode || '',
          parseFloat(item.unit_price) || 0,
          parseInt(item.quantity) || 1,
          parseFloat(item.discount_percent) || 0,
          parseFloat(item.gst_percent) || 0,
          parseFloat(item.total_price) || 0
        );

        if (item.product_id) {
          const prod = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
          if (prod) {
            const prevStock = prod.stock_quantity;
            const newStock = prevStock - parseInt(item.quantity);
            
            updateStockStmt.run(parseInt(item.quantity), item.product_id);
            logStmt.run(item.product_id, -parseInt(item.quantity), prevStock, newStock, `Sold in invoice ${invoiceNumber}`);
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
    return res.status(500).json({ success: false, message: 'Failed to create invoice' });
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
