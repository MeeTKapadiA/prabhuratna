const db = require('../config/db');

// Create Purchase Order
exports.createPurchase = (req, res) => {
  try {
    const {
      supplier_id,
      subtotal,
      tax_amount,
      grand_total,
      payment_status,
      amount_paid,
      notes,
      items
    } = req.body;

    if (!supplier_id) {
      return res.status(400).json({ success: false, message: 'Supplier is required for purchase' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    const supplier = db.prepare('SELECT id, name FROM suppliers WHERE id = ?').get(supplier_id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Auto-generate purchase_number: PUR-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const purchaseNumber = `PUR-${dateStr}-${randomNum}`;

    const paidAmt = parseFloat(amount_paid) || 0;
    const gTotal = parseFloat(grand_total) || 0;
    const pStatus = payment_status || (paidAmt >= gTotal ? 'paid' : paidAmt > 0 ? 'partial' : 'unpaid');
    const remainingBalance = gTotal - paidAmt;

    // Execute in transaction
    const transaction = db.transaction(() => {
      // 1. Insert Purchase
      const purchaseStmt = db.prepare(`
        INSERT INTO purchases (
          purchase_number, supplier_id, subtotal, tax_amount, grand_total,
          payment_status, amount_paid, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = purchaseStmt.run(
        purchaseNumber,
        supplier_id,
        parseFloat(subtotal) || 0,
        parseFloat(tax_amount) || 0,
        gTotal,
        pStatus,
        paidAmt,
        notes || ''
      );

      const purchaseId = result.lastInsertRowid;

      // 2. Insert Purchase Items & Update Product Stock/Cost
      const itemStmt = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, product_id, product_name, quantity, purchase_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateProdStmt = db.prepare(`
        UPDATE products 
        SET stock_quantity = stock_quantity + ?, purchase_price = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const logStmt = db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes)
        VALUES (?, 'PURCHASE', ?, ?, ?, ?)
      `);

      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        const pPrice = parseFloat(item.purchase_price) || 0;
        const tPrice = parseFloat(item.total_price) || (qty * pPrice);

        itemStmt.run(
          purchaseId,
          item.product_id || null,
          item.product_name,
          qty,
          pPrice,
          tPrice
        );

        if (item.product_id) {
          const prod = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
          if (prod) {
            const prevStock = prod.stock_quantity;
            const newStock = prevStock + qty;

            updateProdStmt.run(qty, pPrice, item.product_id);
            logStmt.run(
              item.product_id,
              qty,
              prevStock,
              newStock,
              `Purchased in ${purchaseNumber} from ${supplier.name}`
            );
          }
        }
      }

      // 3. Update Supplier Running Balance
      if (remainingBalance !== 0) {
        db.prepare(`
          UPDATE suppliers
          SET current_balance = current_balance + ?
          WHERE id = ?
        `).run(remainingBalance, supplier_id);
      }

      return purchaseId;
    });

    const purchaseId = transaction();

    // Fetch created purchase with items
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.gst_number as supplier_gst
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(purchaseId);

    const purchaseItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);

    return res.status(201).json({
      success: true,
      message: 'Purchase created successfully and stock updated',
      purchase: {
        ...purchase,
        items: purchaseItems
      }
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return res.status(500).json({ success: false, message: 'Failed to create purchase' });
  }
};

// Get All Purchases
exports.getAllPurchases = (req, res) => {
  try {
    const { supplier_id, payment_status, startDate, endDate, search } = req.query;
    let query = `
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id) {
      query += ` AND p.supplier_id = ?`;
      params.push(supplier_id);
    }

    if (payment_status) {
      query += ` AND p.payment_status = ?`;
      params.push(payment_status);
    }

    if (search) {
      query += ` AND (p.purchase_number LIKE ? OR s.name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (startDate) {
      query += ` AND DATE(p.created_at) >= DATE(?)`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(p.created_at) <= DATE(?)`;
      params.push(endDate);
    }

    query += ` ORDER BY p.id DESC`;

    const purchases = db.prepare(query).all(...params);
    return res.json({ success: true, count: purchases.length, purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
};

// Get Purchase By ID
exports.getPurchaseById = (req, res) => {
  try {
    const { id } = req.params;
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email, s.address as supplier_address, s.gst_number as supplier_gst
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ? OR p.purchase_number = ?
    `).get(id, id);

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchase.id);

    return res.json({
      success: true,
      purchase: {
        ...purchase,
        items
      }
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch purchase details' });
  }
};

// Record Payment Against Purchase
exports.recordPurchasePayment = (req, res) => {
  try {
    const { id } = req.params;
    const { amount_paid, notes } = req.body;

    const newPayment = parseFloat(amount_paid);
    if (isNaN(newPayment) || newPayment <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const transaction = db.transaction(() => {
      const updatedAmountPaid = purchase.amount_paid + newPayment;
      const newStatus = updatedAmountPaid >= purchase.grand_total ? 'paid' : 'partial';

      const updateNotes = notes
        ? `${purchase.notes || ''}\n[Payment ${new Date().toLocaleDateString('en-IN')}]: ₹${newPayment} - ${notes}`.trim()
        : purchase.notes;

      // 1. Update purchase
      db.prepare(`
        UPDATE purchases
        SET amount_paid = ?, payment_status = ?, notes = ?
        WHERE id = ?
      `).run(updatedAmountPaid, newStatus, updateNotes, id);

      // 2. Reduce supplier balance
      db.prepare(`
        UPDATE suppliers
        SET current_balance = current_balance - ?
        WHERE id = ?
      `).run(newPayment, purchase.supplier_id);

      return { updatedAmountPaid, newStatus };
    });

    const result = transaction();

    const updatedPurchase = db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(id);

    return res.json({
      success: true,
      message: `Recorded payment of ₹${newPayment} against ${purchase.purchase_number}`,
      purchase: updatedPurchase
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to record purchase payment' });
  }
};
