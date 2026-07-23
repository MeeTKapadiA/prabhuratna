const db = require('../config/db');

// Create Sales Return / Exchange
exports.createReturn = (req, res) => {
  try {
    const {
      invoice_id,
      customer_name,
      customer_phone,
      reason,
      refund_mode,
      refund_amount,
      status,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Return line items are required' });
    }

    if (!refund_mode) {
      return res.status(400).json({ success: false, message: 'Refund mode is required (cash, store_credit, exchange)' });
    }

    // Auto-generate return_number: RET-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const returnNumber = `RET-${dateStr}-${randomNum}`;

    const totalRefund = parseFloat(refund_amount) || 0;

    const transaction = db.transaction(() => {
      // 1. Insert Return Header
      const returnStmt = db.prepare(`
        INSERT INTO returns (
          return_number, invoice_id, customer_name, customer_phone,
          reason, refund_mode, refund_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = returnStmt.run(
        returnNumber,
        invoice_id || null,
        customer_name || 'Walk-in Customer',
        customer_phone || '',
        reason || '',
        refund_mode,
        totalRefund,
        status || 'completed'
      );

      const returnId = result.lastInsertRowid;

      // 2. Insert Return Items & Update Stock (If Restockable)
      const itemStmt = db.prepare(`
        INSERT INTO return_items (
          return_id, product_id, product_name, quantity, unit_price, total_price, is_damaged
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);

      const logStmt = db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        const uPrice = parseFloat(item.unit_price) || 0;
        const tPrice = parseFloat(item.total_price) || (qty * uPrice);
        const isDamaged = item.is_damaged ? 1 : 0;

        itemStmt.run(
          returnId,
          item.product_id || null,
          item.product_name,
          qty,
          uPrice,
          tPrice,
          isDamaged
        );

        if (item.product_id) {
          const prod = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
          if (prod) {
            const prevStock = prod.stock_quantity;

            if (!isDamaged) {
              // Restock item
              const newStock = prevStock + qty;
              updateStockStmt.run(qty, item.product_id);
              logStmt.run(
                item.product_id,
                'RETURN',
                qty,
                prevStock,
                newStock,
                `Returned in ${returnNumber}`
              );
            } else {
              // Damaged item - do not restock
              logStmt.run(
                item.product_id,
                'RETURN_DAMAGED',
                0,
                prevStock,
                prevStock,
                `Damaged item returned in ${returnNumber} (not restocked)`
              );
            }
          }
        }
      }

      return returnId;
    });

    const returnId = transaction();

    const returnRecord = db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId);
    const returnItems = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(returnId);

    return res.status(201).json({
      success: true,
      message: 'Return processed successfully',
      return: {
        ...returnRecord,
        items: returnItems
      }
    });
  } catch (error) {
    console.error('Error creating return:', error);
    return res.status(500).json({ success: false, message: 'Failed to process return' });
  }
};

// Get All Returns
exports.getAllReturns = (req, res) => {
  try {
    const { startDate, endDate, status, refund_mode, search } = req.query;
    let query = `
      SELECT r.*, i.invoice_number
      FROM returns r
      LEFT JOIN invoices i ON r.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (refund_mode) {
      query += ` AND r.refund_mode = ?`;
      params.push(refund_mode);
    }

    if (search) {
      query += ` AND (r.return_number LIKE ? OR r.customer_name LIKE ? OR i.invoice_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (startDate) {
      query += ` AND DATE(r.created_at) >= DATE(?)`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(r.created_at) <= DATE(?)`;
      params.push(endDate);
    }

    query += ` ORDER BY r.id DESC`;

    const returns = db.prepare(query).all(...params);
    return res.json({ success: true, count: returns.length, returns });
  } catch (error) {
    console.error('Error fetching returns:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch returns' });
  }
};

// Get Return By ID
exports.getReturnById = (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = db.prepare(`
      SELECT r.*, i.invoice_number
      FROM returns r
      LEFT JOIN invoices i ON r.invoice_id = i.id
      WHERE r.id = ? OR r.return_number = ?
    `).get(id, id);

    if (!returnRecord) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    const items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(returnRecord.id);

    return res.json({
      success: true,
      return: {
        ...returnRecord,
        items
      }
    });
  } catch (error) {
    console.error('Error fetching return detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch return details' });
  }
};

// Lookup Invoice for Return Pre-fill
exports.lookupInvoiceForReturn = (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = db.prepare('SELECT * FROM invoices WHERE invoice_number = ? OR id = ?').get(invoiceNumber, invoiceNumber);

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
    console.error('Error looking up invoice:', error);
    return res.status(500).json({ success: false, message: 'Failed to lookup invoice' });
  }
};
