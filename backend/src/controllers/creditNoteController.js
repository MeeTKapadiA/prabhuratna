const db = require('../config/db');
const { getFinancialYear } = require('../utils/fyHelper');
const { roundMoney } = require('../utils/saleItems');
const { processGstSaleItems } = require('../utils/gst');
const { auditFromReq } = require('../utils/audit');
const { _adjustProductStock, _getShopSettings } = require('./billingController');

exports.createCreditNote = (req, res) => {
  try {
    const {
      invoice_id,
      reason,
      items,
      restock_bucket = 'saleable',
      customer_name,
      customer_gstin
    } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ success: false, message: 'invoice_id is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Credit note items are required' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot issue credit note on cancelled invoice' });
    }

    const settings = _getShopSettings();
    const { processedItems, finalSubtotal, finalCgst, finalSgst, finalIgst, finalTax } = processGstSaleItems(items, {
      shopGstin: settings.shop_gstin,
      customerGstin: customer_gstin || invoice.customer_gstin,
      isInterState: invoice.tax_type === 'IGST'
    });
    const grandTotal = roundMoney(finalSubtotal + finalTax);
    const bucket = ['saleable', 'damaged', 'display', 'scrap'].includes(restock_bucket) ? restock_bucket : 'saleable';

    const tx = db.transaction(() => {
      const fy = getFinancialYear();
      db.prepare(`
        INSERT INTO credit_note_counters (financial_year, last_number)
        VALUES (?, 0) ON CONFLICT(financial_year) DO NOTHING
      `).run(fy);
      db.prepare(`UPDATE credit_note_counters SET last_number = last_number + 1 WHERE financial_year = ?`).run(fy);
      const counter = db.prepare('SELECT last_number FROM credit_note_counters WHERE financial_year = ?').get(fy);
      const creditNoteNumber = `CN/${fy}/${String(counter.last_number).padStart(4, '0')}`;

      const result = db.prepare(`
        INSERT INTO credit_notes (
          credit_note_number, invoice_id, customer_id, customer_name, customer_gstin, reason,
          subtotal, cgst_amount, sgst_amount, igst_amount, tax_amount, grand_total, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        creditNoteNumber,
        invoice.id,
        invoice.customer_id,
        customer_name || invoice.customer_name,
        customer_gstin || invoice.customer_gstin || '',
        reason || 'Sales return',
        finalSubtotal,
        finalCgst,
        finalSgst,
        finalIgst,
        finalTax,
        grandTotal,
        req.user?.id || null
      );

      const creditNoteId = result.lastInsertRowid;
      const itemStmt = db.prepare(`
        INSERT INTO credit_note_items (
          credit_note_id, product_id, product_name, hsn_sac, quantity, unit_price, gst_percent,
          taxable_value, cgst_amount, sgst_amount, igst_amount, total_price, restock_bucket
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        itemStmt.run(
          creditNoteId,
          item.product_id,
          item.product_name,
          item.hsn_sac,
          item.quantity,
          item.unit_price,
          item.gst_percent,
          item.taxable_value,
          item.cgst_amount,
          item.sgst_amount,
          item.igst_amount,
          item.total_price,
          bucket
        );

        if (item.product_id) {
          _adjustProductStock(
            item.product_id,
            item.quantity,
            bucket,
            'CREDIT_NOTE_RESTOCK',
            `Credit note ${creditNoteNumber}`,
            req.user?.id
          );
        }
      }

      // Reduce receivable if any
      if (invoice.customer_id && Number(invoice.balance_due) > 0) {
        const reduce = Math.min(Number(invoice.balance_due), grandTotal);
        db.prepare(`
          UPDATE invoices SET
            balance_due = MAX(0, balance_due - ?),
            payment_status = CASE WHEN MAX(0, balance_due - ?) <= 0 THEN 'paid' ELSE payment_status END
          WHERE id = ?
        `).run(reduce, reduce, invoice.id);
        db.prepare('UPDATE customers SET current_balance = MAX(0, current_balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(reduce, invoice.customer_id);
      }

      return creditNoteId;
    });

    const creditNoteId = tx();
    const note = db.prepare('SELECT * FROM credit_notes WHERE id = ?').get(creditNoteId);
    const noteItems = db.prepare('SELECT * FROM credit_note_items WHERE credit_note_id = ?').all(creditNoteId);
    auditFromReq(req, 'CREDIT_NOTE_CREATE', 'credit_note', creditNoteId, { credit_note_number: note.credit_note_number });

    return res.status(201).json({
      success: true,
      message: 'Credit note issued',
      credit_note: { ...note, items: noteItems }
    });
  } catch (error) {
    console.error('Credit note error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 400 ? error.message : 'Failed to create credit note'
    });
  }
};

exports.getAllCreditNotes = (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    let query = 'SELECT * FROM credit_notes WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (credit_note_number LIKE ? OR customer_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (startDate) {
      query += ' AND DATE(created_at) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(created_at) <= DATE(?)';
      params.push(endDate);
    }
    query += ' ORDER BY id DESC';
    const notes = db.prepare(query).all(...params);
    return res.json({ success: true, count: notes.length, credit_notes: notes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch credit notes' });
  }
};

exports.getCreditNoteById = (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM credit_notes WHERE id = ? OR credit_note_number = ?').get(req.params.id, req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Credit note not found' });
    const items = db.prepare('SELECT * FROM credit_note_items WHERE credit_note_id = ?').all(note.id);
    return res.json({ success: true, credit_note: { ...note, items } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch credit note' });
  }
};
