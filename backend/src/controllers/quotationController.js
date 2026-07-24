const db = require('../config/db');
const { getFinancialYear } = require('../utils/fyHelper');

exports.createQuotation = (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      subtotal,
      tax_amount,
      discount_amount,
      grand_total,
      notes,
      valid_until,
      items
    } = req.body;

    if (!customer_name) {
      return res.status(400).json({ success: false, message: 'Customer name is required for quotation' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Quotation items are required' });
    }

    const transaction = db.transaction(() => {
      // Atomic sequential quotation number generation
      const fy = getFinancialYear();
      db.prepare(`
        INSERT INTO quotation_counters (financial_year, last_number)
        VALUES (?, 0)
        ON CONFLICT(financial_year) DO NOTHING
      `).run(fy);

      db.prepare(`
        UPDATE quotation_counters
        SET last_number = last_number + 1
        WHERE financial_year = ?
      `).run(fy);

      const counterRow = db.prepare('SELECT last_number FROM quotation_counters WHERE financial_year = ?').get(fy);
      const paddedNumber = String(counterRow.last_number).padStart(4, '0');
      const quotationNumber = `QTN/${fy}/${paddedNumber}`;

      const qtnStmt = db.prepare(`
        INSERT INTO quotations (
          quotation_number, customer_name, customer_phone, customer_email, customer_address,
          subtotal, tax_amount, discount_amount, grand_total, notes, valid_until
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = qtnStmt.run(
        quotationNumber,
        customer_name,
        customer_phone || '',
        customer_email || '',
        customer_address || '',
        parseFloat(subtotal) || 0,
        parseFloat(tax_amount) || 0,
        parseFloat(discount_amount) || 0,
        parseFloat(grand_total) || 0,
        notes || '',
        valid_until || null
      );

      const quotationId = result.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO quotation_items (
          quotation_id, product_id, product_name, barcode, unit_price, quantity,
          discount_percent, gst_percent, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        itemStmt.run(
          quotationId,
          item.product_id || null,
          item.product_name,
          item.barcode || '',
          parseFloat(item.unit_price) || 0,
          parseInt(item.quantity) || 1,
          parseFloat(item.discount_percent) || 0,
          parseFloat(item.gst_percent) || 0,
          parseFloat(item.total_price) || 0
        );
      }

      return quotationId;
    });

    const quotationId = transaction();
    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(quotationId);
    const quotationItems = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotationId);

    return res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      quotation: {
        ...quotation,
        items: quotationItems
      }
    });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return res.status(500).json({ success: false, message: 'Failed to create quotation' });
  }
};

exports.getAllQuotations = (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT * FROM quotations WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (quotation_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY id DESC`;

    const quotations = db.prepare(query).all(...params);
    return res.json({ success: true, count: quotations.length, quotations });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quotations' });
  }
};

exports.getQuotationById = (req, res) => {
  try {
    const { id } = req.params;
    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ? OR quotation_number = ?').get(id, id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotation.id);
    return res.json({
      success: true,
      quotation: {
        ...quotation,
        items
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch quotation' });
  }
};

exports.updateQuotationStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run(status, id);
    return res.json({ success: true, message: `Quotation status updated to ${status}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update quotation status' });
  }
};
