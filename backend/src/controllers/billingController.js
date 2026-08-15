const db = require('../config/db');
const { getFinancialYear } = require('../utils/fyHelper');
const { roundMoney } = require('../utils/saleItems');
const { processGstSaleItems, computeInvoiceTotals, applyManualTaxSplit, hasExplicitTaxOverride } = require('../utils/gst');
const { auditFromReq } = require('../utils/audit');

const ALLOWED_PAYMENT_MODES = new Set(['CASH', 'UPI', 'CARD', 'MIXED', 'CREDIT', 'NEFT', 'RTGS']);

function getLocalDateTimeString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Accept YYYY-MM-DD or YYYY-MM-DD HH:MM[:SS] as invoice date; null → now. */
function resolveInvoiceCreatedAt(raw) {
  const s = String(raw || '').trim();
  if (!s) return getLocalDateTimeString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${s} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?/);
  if (m) {
    return `${m[1]} ${m[2]}:${m[3] || '00'}`;
  }
  return getLocalDateTimeString();
}

function getShopSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach((row) => { settings[row.key] = row.value; });
  return settings;
}

function ensureCustomer({ customer_id, customer_name, customer_phone, customer_email, customer_gstin, customer_address }) {
  if (customer_id) {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (existing) return existing;
  }

  const name = (customer_name || 'Walk-in Customer').trim();
  const phone = (customer_phone || '').trim();
  if (phone) {
    const byPhone = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    if (byPhone) {
      db.prepare(`
        UPDATE customers SET
          name = COALESCE(NULLIF(?, ''), name),
          email = COALESCE(NULLIF(?, ''), email),
          gstin = COALESCE(NULLIF(?, ''), gstin),
          address = COALESCE(NULLIF(?, ''), address),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(name, customer_email || '', customer_gstin || '', customer_address || '', byPhone.id);
      return db.prepare('SELECT * FROM customers WHERE id = ?').get(byPhone.id);
    }
  }

  if (name === 'Walk-in Customer' && !phone && !customer_gstin) {
    return null;
  }

  const result = db.prepare(`
    INSERT INTO customers (name, phone, email, address, gstin)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, phone, customer_email || '', customer_address || '', customer_gstin || '');
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
}

function adjustProductStock(productId, qtyChange, bucket, changeType, notes, userId) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return;

  const field = bucket === 'damaged' ? 'damaged_stock'
    : bucket === 'display' ? 'display_stock'
      : bucket === 'scrap' ? 'scrap_stock'
        : 'stock_quantity';

  const prev = Number(product[field]) || 0;
  const next = prev + qtyChange;
  if (field === 'stock_quantity' && next < 0) {
    const error = new Error(`Insufficient saleable stock for product #${productId}`);
    error.statusCode = 400;
    throw error;
  }
  if (next < 0) {
    const error = new Error(`Insufficient ${bucket} stock for product #${productId}`);
    error.statusCode = 400;
    throw error;
  }

  db.prepare(`UPDATE products SET ${field} = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(next, productId);
  db.prepare(`
    INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes, user_id, stock_bucket)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(productId, changeType, qtyChange, prev, next, notes || '', userId || null, bucket || 'saleable');
}

exports.createInvoice = (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_gstin,
      customer_pan,
      customer_address,
      place_of_supply,
      po_number,
      invoice_number: requestedInvoiceNumber,
      discount_amount: rawDiscountAmount,
      scrap_value: rawScrapValue,
      transport_amount: rawTransport,
      round_off: rawRoundOff,
      payment_mode,
      amount_paid: rawAmountPaid,
      notes,
      items,
      is_inter_state,
      cgst_amount: rawCgst,
      sgst_amount: rawSgst,
      igst_amount: rawIgst,
      invoice_date,
      created_at: rawCreatedAt
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to generate invoice' });
    }

    const normalizedPaymentMode = String(payment_mode || '').toUpperCase();
    if (!ALLOWED_PAYMENT_MODES.has(normalizedPaymentMode)) {
      return res.status(400).json({ success: false, message: 'Valid payment mode is required' });
    }

    const settings = getShopSettings();
    const customer = ensureCustomer({
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_gstin,
      customer_address
    });

    let { taxType, processedItems, finalSubtotal, finalCgst, finalSgst, finalIgst, finalTax } = processGstSaleItems(items, {
      shopGstin: settings.shop_gstin,
      customerGstin: customer_gstin || customer?.gstin,
      isInterState: is_inter_state
    });

    // Explicit tax breakdown from Billing UI overrides auto GSTIN split
    if (hasExplicitTaxOverride({ cgst_amount: rawCgst, sgst_amount: rawSgst, igst_amount: rawIgst })) {
      const manual = applyManualTaxSplit(processedItems, {
        cgst: rawCgst,
        sgst: rawSgst,
        igst: rawIgst
      });
      taxType = manual.taxType;
      processedItems = manual.processedItems;
      finalCgst = manual.finalCgst;
      finalSgst = manual.finalSgst;
      finalIgst = manual.finalIgst;
      finalTax = manual.finalTax;
    } else if (typeof is_inter_state === 'boolean') {
      // Force split type via toggle without custom amounts — already handled in processGstSaleItems
    }

    const invoiceCreatedAt = resolveInvoiceCreatedAt(invoice_date || rawCreatedAt);

    const requestedDiscount = Math.max(0, Number.parseFloat(rawDiscountAmount) || 0);
    const finalDiscount = roundMoney(Math.min(requestedDiscount, finalSubtotal + finalTax));
    const finalScrap = roundMoney(Math.max(0, Number.parseFloat(rawScrapValue) || 0));
    const finalTransport = roundMoney(Math.max(0, Number.parseFloat(rawTransport) || 0));
    const { round_off: finalRoundOff, grand_total: finalGrandTotal } = computeInvoiceTotals({
      subtotal: finalSubtotal,
      taxAmount: finalTax,
      discountAmount: finalDiscount,
      scrapValue: finalScrap,
      transportAmount: finalTransport,
      roundOff: rawRoundOff
    });

    if (!Number.isFinite(finalGrandTotal) || finalGrandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice grand total is invalid or ₹0. Please check items and pricing before proceeding.'
      });
    }

    let amountPaid = Number.parseFloat(rawAmountPaid);
    if (!Number.isFinite(amountPaid)) {
      amountPaid = normalizedPaymentMode === 'CREDIT' ? 0 : finalGrandTotal;
    }
    amountPaid = roundMoney(Math.max(0, Math.min(amountPaid, finalGrandTotal)));
    const balanceDue = roundMoney(finalGrandTotal - amountPaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

    const transaction = db.transaction(() => {
      const fy = getFinancialYear();
      const manualNumber = String(requestedInvoiceNumber || '').trim();
      let invoiceNumber;

      if (manualNumber) {
        const dup = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(manualNumber);
        if (dup) {
          const error = new Error(`Invoice number "${manualNumber}" is already used. Choose a different number.`);
          error.statusCode = 400;
          throw error;
        }
        // Manual override — do not bump the sequential counter
        invoiceNumber = manualNumber;
      } else {
        db.prepare(`
          INSERT INTO invoice_counters (financial_year, last_number)
          VALUES (?, 0)
          ON CONFLICT(financial_year) DO NOTHING
        `).run(fy);
        db.prepare(`UPDATE invoice_counters SET last_number = last_number + 1 WHERE financial_year = ?`).run(fy);
        const counterRow = db.prepare('SELECT last_number FROM invoice_counters WHERE financial_year = ?').get(fy);
        invoiceNumber = `INV/${fy}/${String(counterRow.last_number).padStart(4, '0')}`;
      }

      const invoiceStmt = db.prepare(`
        INSERT INTO invoices (
          invoice_number, customer_id, customer_name, customer_phone, customer_email, customer_gstin, customer_pan, customer_address,
          place_of_supply, po_number, subtotal, tax_amount, cgst_amount, sgst_amount, igst_amount, tax_type,
          discount_amount, scrap_value, transport_amount, round_off, grand_total,
          payment_mode, amount_paid, balance_due, payment_status, status, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
      `);

      const result = invoiceStmt.run(
        invoiceNumber,
        customer?.id || null,
        customer_name || customer?.name || 'Walk-in Customer',
        customer_phone || customer?.phone || '',
        customer_email || customer?.email || '',
        customer_gstin || customer?.gstin || '',
        customer_pan || '',
        customer_address || customer?.address || '',
        place_of_supply || '',
        String(po_number || '').trim(),
        finalSubtotal,
        finalTax,
        finalCgst,
        finalSgst,
        finalIgst,
        taxType,
        finalDiscount,
        finalScrap,
        finalTransport,
        finalRoundOff,
        finalGrandTotal,
        normalizedPaymentMode,
        amountPaid,
        balanceDue,
        paymentStatus,
        notes || '',
        req.user?.id || null,
        invoiceCreatedAt
      );

      const invoiceId = result.lastInsertRowid;
      const itemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, product_id, product_name, barcode, hsn_sac, unit, unit_price, quantity,
          discount_percent, gst_percent, taxable_value, cgst_amount, sgst_amount, igst_amount,
          total_price, is_custom, size_variant, gauge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        itemStmt.run(
          invoiceId,
          item.product_id,
          item.product_name,
          item.barcode,
          item.hsn_sac,
          item.unit,
          item.unit_price,
          item.quantity,
          item.discount_percent,
          item.gst_percent,
          item.taxable_value,
          item.cgst_amount,
          item.sgst_amount,
          item.igst_amount,
          item.total_price,
          item.is_custom,
          item.size_variant,
          item.gauge
        );

        if (item.product_id && !item.is_custom) {
          adjustProductStock(
            item.product_id,
            -item.quantity,
            'saleable',
            'SALE',
            `Sold in invoice ${invoiceNumber}`,
            req.user?.id
          );
        }
      }

      if (amountPaid > 0) {
        db.prepare(`
          INSERT INTO invoice_payments (invoice_id, amount, payment_mode, notes, received_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(invoiceId, amountPaid, normalizedPaymentMode === 'CREDIT' ? 'CASH' : normalizedPaymentMode, 'Initial payment', req.user?.id || null);
      }

      if (customer?.id && balanceDue > 0) {
        db.prepare(`UPDATE customers SET current_balance = current_balance + ?, updated_at = datetime('now', 'localtime') WHERE id = ?`)
          .run(balanceDue, customer.id);
      }

      return invoiceId;
    });

    const invoiceId = transaction();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    const payments = db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY id').all(invoiceId);

    auditFromReq(req, 'INVOICE_CREATE', 'invoice', invoiceId, { invoice_number: invoice.invoice_number, grand_total: invoice.grand_total });

    // Low stock WhatsApp deep-link hints (client can open)
    const lowStock = db.prepare(`
      SELECT id, name, sku, stock_quantity, min_stock_level
      FROM products
      WHERE is_active = 1 AND stock_quantity <= min_stock_level
      ORDER BY stock_quantity ASC
      LIMIT 10
    `).all();

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: { ...invoice, items: invoiceItems, payments },
      low_stock_alerts: lowStock
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 400 ? error.message : 'Failed to create invoice'
    });
  }
};

/** Peek next sequential invoice number without incrementing the counter. */
exports.getNextInvoiceNumber = (req, res) => {
  try {
    const fy = getFinancialYear();
    db.prepare(`
      INSERT INTO invoice_counters (financial_year, last_number)
      VALUES (?, 0)
      ON CONFLICT(financial_year) DO NOTHING
    `).run(fy);
    const row = db.prepare('SELECT last_number FROM invoice_counters WHERE financial_year = ?').get(fy);
    const next = (row?.last_number || 0) + 1;
    const invoice_number = `INV/${fy}/${String(next).padStart(4, '0')}`;
    return res.json({
      success: true,
      invoice_number,
      financial_year: fy,
      next_sequence: next
    });
  } catch (error) {
    console.error('Error fetching next invoice number:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch next invoice number' });
  }
};

exports.getAllInvoices = (req, res) => {
  try {
    const { search, payment_mode, payment_status, status, startDate, endDate } = req.query;
    let query = `SELECT * FROM invoices WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_gstin LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (payment_mode) {
      query += ` AND payment_mode = ?`;
      params.push(payment_mode);
    }
    if (payment_status) {
      query += ` AND payment_status = ?`;
      params.push(payment_status);
    }
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    } else {
      query += ` AND (status IS NULL OR status != 'cancelled')`;
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
    const payments = db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY id').all(invoice.id);
    return res.json({ success: true, invoice: { ...invoice, items, payments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
};

exports.recordInvoicePayment = (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode, notes } = req.body;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot collect payment on a cancelled invoice' });
    }

    const payAmount = roundMoney(Number.parseFloat(amount) || 0);
    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }
    if (payAmount > Number(invoice.balance_due || 0) + 0.001) {
      return res.status(400).json({ success: false, message: 'Payment exceeds balance due' });
    }

    const mode = String(payment_mode || 'CASH').toUpperCase();
    if (!ALLOWED_PAYMENT_MODES.has(mode) || mode === 'CREDIT') {
      return res.status(400).json({ success: false, message: 'Invalid payment mode' });
    }

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO invoice_payments (invoice_id, amount, payment_mode, notes, received_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(invoice.id, payAmount, mode, notes || '', req.user?.id || null);

      const newPaid = roundMoney((Number(invoice.amount_paid) || 0) + payAmount);
      const newDue = roundMoney(Math.max(0, (Number(invoice.grand_total) || 0) - newPaid));
      const paymentStatus = newDue <= 0 ? 'paid' : 'partial';
      db.prepare(`
        UPDATE invoices SET amount_paid = ?, balance_due = ?, payment_status = ?, payment_mode = CASE WHEN payment_mode = 'CREDIT' THEN ? ELSE payment_mode END
        WHERE id = ?
      `).run(newPaid, newDue, paymentStatus, mode, invoice.id);

      if (invoice.customer_id) {
        db.prepare(`UPDATE customers SET current_balance = MAX(0, current_balance - ?), updated_at = datetime('now', 'localtime') WHERE id = ?`)
          .run(payAmount, invoice.customer_id);
      }
    });
    tx();

    auditFromReq(req, 'INVOICE_PAYMENT', 'invoice', invoice.id, { amount: payAmount, payment_mode: mode });
    return exports.getInvoiceById(req, res);
  } catch (error) {
    console.error('Invoice payment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

exports.cancelInvoice = (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Invoice already cancelled' });
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);

    const tx = db.transaction(() => {
      for (const item of items) {
        if (item.product_id && !item.is_custom) {
          adjustProductStock(
            item.product_id,
            item.quantity,
            'saleable',
            'CANCEL_RESTOCK',
            `Restock from cancelled invoice ${invoice.invoice_number}`,
            req.user?.id
          );
        }
      }

      if (invoice.customer_id && Number(invoice.balance_due) > 0) {
        db.prepare(`UPDATE customers SET current_balance = MAX(0, current_balance - ?), updated_at = datetime('now', 'localtime') WHERE id = ?`)
          .run(invoice.balance_due, invoice.customer_id);
      }

      db.prepare(`
        UPDATE invoices
        SET status = 'cancelled', cancelled_at = datetime('now', 'localtime'), cancel_reason = ?,
            balance_due = 0, payment_status = 'cancelled'
        WHERE id = ?
      `).run(reason || 'Cancelled by user', invoice.id);
    });
    tx();

    auditFromReq(req, 'INVOICE_CANCEL', 'invoice', invoice.id, { reason });
    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
    return res.json({ success: true, message: 'Invoice cancelled. Stock restored. Use Credit Note for GST reverse if needed.', invoice: updated });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 400 ? error.message : 'Failed to cancel invoice'
    });
  }
};

// Exported for credit notes / returns
exports._adjustProductStock = adjustProductStock;
exports._getShopSettings = getShopSettings;
