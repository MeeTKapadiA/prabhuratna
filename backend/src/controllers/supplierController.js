const db = require('../config/db');

// Create Supplier
exports.createSupplier = (req, res) => {
  try {
    const { name, phone, email, address, gst_number, opening_balance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const openBal = parseFloat(opening_balance) || 0;
    const stmt = db.prepare(`
      INSERT INTO suppliers (name, phone, email, address, gst_number, opening_balance, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      phone || '',
      email || '',
      address || '',
      gst_number || '',
      openBal,
      openBal
    );

    const newSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      supplier: newSupplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
};

// Get All Suppliers
exports.getAllSuppliers = (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM suppliers WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR gst_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY name ASC`;

    const suppliers = db.prepare(query).all(...params);
    return res.json({ success: true, count: suppliers.length, suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
};

// Get Supplier By ID
exports.getSupplierById = (req, res) => {
  try {
    const { id } = req.params;
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Fetch recent purchases for this supplier
    const purchases = db.prepare('SELECT * FROM purchases WHERE supplier_id = ? ORDER BY id DESC').all(id);

    return res.json({
      success: true,
      supplier: {
        ...supplier,
        purchases
      }
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch supplier details' });
  }
};

// Update Supplier
exports.updateSupplier = (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, gst_number, opening_balance } = req.body;

    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const openBal = opening_balance !== undefined ? parseFloat(opening_balance) : existing.opening_balance;
    
    // Balance adjustment if opening balance changed
    const diff = openBal - existing.opening_balance;
    const newCurrentBal = existing.current_balance + diff;

    db.prepare(`
      UPDATE suppliers
      SET name = ?, phone = ?, email = ?, address = ?, gst_number = ?, opening_balance = ?, current_balance = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      address !== undefined ? address : existing.address,
      gst_number !== undefined ? gst_number : existing.gst_number,
      openBal,
      newCurrentBal,
      id
    );

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: 'Supplier updated successfully',
      supplier: updated
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
};
