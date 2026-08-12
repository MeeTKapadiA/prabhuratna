const db = require('../config/db');
const { auditFromReq } = require('../utils/audit');

exports.getAllCustomers = (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR gstin LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    query += ' ORDER BY updated_at DESC, id DESC';
    const customers = db.prepare(query).all(...params);
    return res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

exports.createCustomer = (req, res) => {
  try {
    const { name, phone, email, address, gstin, opening_balance, notes } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    const opening = Number.parseFloat(opening_balance) || 0;
    const result = db.prepare(`
      INSERT INTO customers (name, phone, email, address, gstin, opening_balance, current_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(name).trim(),
      phone || '',
      email || '',
      address || '',
      gstin || '',
      opening,
      opening,
      notes || ''
    );
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    auditFromReq(req, 'CUSTOMER_CREATE', 'customer', customer.id, { name: customer.name });
    return res.status(201).json({ success: true, customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
};

exports.updateCustomer = (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Customer not found' });
    const { name, phone, email, address, gstin, notes } = req.body;
    db.prepare(`
      UPDATE customers SET
        name = ?, phone = ?, email = ?, address = ?, gstin = ?, notes = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      name || existing.name,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      address !== undefined ? address : existing.address,
      gstin !== undefined ? gstin : existing.gstin,
      notes !== undefined ? notes : existing.notes,
      existing.id
    );
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(existing.id);
    return res.json({ success: true, customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
};

exports.getCustomerById = (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const invoices = db.prepare(`
      SELECT id, invoice_number, grand_total, amount_paid, balance_due, payment_status, status, created_at
      FROM invoices WHERE customer_id = ? ORDER BY id DESC LIMIT 50
    `).all(customer.id);
    return res.json({ success: true, customer, invoices });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
};

exports.getReceivables = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.id, c.name, c.phone, c.gstin, c.current_balance,
        COUNT(i.id) as open_invoices,
        COALESCE(SUM(i.balance_due), 0) as total_due
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id AND i.balance_due > 0 AND (i.status IS NULL OR i.status = 'active')
      WHERE c.current_balance > 0 OR i.balance_due > 0
      GROUP BY c.id
      ORDER BY total_due DESC
    `).all();
    return res.json({ success: true, receivables: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch receivables' });
  }
};
