const db = require('../config/db');
const { roundMoney } = require('../utils/saleItems');
const { auditFromReq } = require('../utils/audit');
const { todayLocalSql } = require('../utils/datetime');

const CATEGORIES = ['Rent', 'Salary', 'Transport', 'Utilities', 'Maintenance', 'Marketing', 'Misc'];

exports.getExpenses = (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (startDate) {
      query += ' AND DATE(expense_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(expense_date) <= DATE(?)';
      params.push(endDate);
    }
    query += ' ORDER BY expense_date DESC, id DESC';
    const expenses = db.prepare(query).all(...params);
    const total = expenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    return res.json({ success: true, categories: CATEGORIES, total: roundMoney(total), expenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

exports.createExpense = (req, res) => {
  try {
    const { category, description, amount, payment_mode, expense_date } = req.body;
    const amt = roundMoney(Number.parseFloat(amount) || 0);
    if (!category || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Category and positive amount are required' });
    }
    const result = db.prepare(`
      INSERT INTO expenses (category, description, amount, payment_mode, expense_date, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      category,
      description || '',
      amt,
      String(payment_mode || 'CASH').toUpperCase(),
      expense_date || todayLocalSql(),
      req.user?.id || null
    );
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    auditFromReq(req, 'EXPENSE_CREATE', 'expense', expense.id, { category, amount: amt });
    return res.status(201).json({ success: true, expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};

exports.deleteExpense = (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Expense not found' });
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    auditFromReq(req, 'EXPENSE_DELETE', 'expense', req.params.id);
    return res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};
