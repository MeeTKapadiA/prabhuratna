const db = require('../config/db');
const { roundMoney } = require('../utils/saleItems');
const { auditFromReq } = require('../utils/audit');

function summarizeDay(date) {
  const sales = db.prepare(`
    SELECT payment_mode,
      SUM(CASE WHEN status = 'active' OR status IS NULL THEN amount_paid ELSE 0 END) as collected
    FROM invoices
    WHERE DATE(created_at) = DATE(?)
    GROUP BY payment_mode
  `).all(date);

  const modeMap = { CASH: 0, UPI: 0, CARD: 0, MIXED: 0, CREDIT: 0 };
  sales.forEach((row) => {
    modeMap[row.payment_mode] = roundMoney(row.collected || 0);
  });

  const creditSales = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) as total
    FROM invoices
    WHERE DATE(created_at) = DATE(?) AND payment_mode = 'CREDIT' AND (status = 'active' OR status IS NULL)
  `).get(date);

  const cashExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE DATE(expense_date) = DATE(?) AND payment_mode = 'CASH'
  `).get(date);

  return {
    cash_sales: modeMap.CASH,
    upi_sales: modeMap.UPI,
    card_sales: modeMap.CARD,
    mixed_sales: modeMap.MIXED,
    credit_sales: roundMoney(creditSales.total || 0),
    cash_expenses: roundMoney(cashExpenses.total || 0)
  };
}

exports.getCashbook = (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    let entry = db.prepare('SELECT * FROM cashbook_entries WHERE entry_date = ?').get(date);
    const live = summarizeDay(date);

    if (!entry) {
      entry = {
        entry_date: date,
        opening_cash: 0,
        closing_cash: null,
        notes: '',
        ...live
      };
    } else {
      entry = { ...entry, live };
    }

    return res.json({ success: true, cashbook: entry, live });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load cashbook' });
  }
};

exports.saveCashbook = (req, res) => {
  try {
    const date = req.body.entry_date || new Date().toISOString().slice(0, 10);
    const opening = roundMoney(Number.parseFloat(req.body.opening_cash) || 0);
    const closing = req.body.closing_cash === undefined || req.body.closing_cash === null || req.body.closing_cash === ''
      ? null
      : roundMoney(Number.parseFloat(req.body.closing_cash) || 0);
    const notes = req.body.notes || '';
    const live = summarizeDay(date);

    db.prepare(`
      INSERT INTO cashbook_entries (
        entry_date, opening_cash, closing_cash, cash_sales, upi_sales, card_sales, credit_sales, cash_expenses, notes, closed_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(entry_date) DO UPDATE SET
        opening_cash = excluded.opening_cash,
        closing_cash = excluded.closing_cash,
        cash_sales = excluded.cash_sales,
        upi_sales = excluded.upi_sales,
        card_sales = excluded.card_sales,
        credit_sales = excluded.credit_sales,
        cash_expenses = excluded.cash_expenses,
        notes = excluded.notes,
        closed_by = excluded.closed_by,
        updated_at = datetime('now', 'localtime')
    `).run(
      date,
      opening,
      closing,
      live.cash_sales,
      live.upi_sales,
      live.card_sales,
      live.credit_sales,
      live.cash_expenses,
      notes,
      req.user?.id || null
    );

    const entry = db.prepare('SELECT * FROM cashbook_entries WHERE entry_date = ?').get(date);
    auditFromReq(req, 'CASHBOOK_SAVE', 'cashbook', date, { opening_cash: opening, closing_cash: closing });
    return res.json({ success: true, cashbook: entry, live });
  } catch (error) {
    console.error('Cashbook save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save cashbook' });
  }
};

exports.getSupplierAging = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        s.id, s.name, s.phone, s.current_balance,
        COALESCE(SUM(CASE WHEN JULIANDAY('now') - JULIANDAY(p.created_at) <= 30 THEN (p.grand_total - p.amount_paid) ELSE 0 END), 0) as due_0_30,
        COALESCE(SUM(CASE WHEN JULIANDAY('now') - JULIANDAY(p.created_at) > 30 AND JULIANDAY('now') - JULIANDAY(p.created_at) <= 60 THEN (p.grand_total - p.amount_paid) ELSE 0 END), 0) as due_31_60,
        COALESCE(SUM(CASE WHEN JULIANDAY('now') - JULIANDAY(p.created_at) > 60 AND JULIANDAY('now') - JULIANDAY(p.created_at) <= 90 THEN (p.grand_total - p.amount_paid) ELSE 0 END), 0) as due_61_90,
        COALESCE(SUM(CASE WHEN JULIANDAY('now') - JULIANDAY(p.created_at) > 90 THEN (p.grand_total - p.amount_paid) ELSE 0 END), 0) as due_90_plus
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id AND p.payment_status != 'paid' AND (p.grand_total - p.amount_paid) > 0
      GROUP BY s.id
      HAVING s.current_balance > 0 OR due_0_30 > 0 OR due_31_60 > 0 OR due_61_90 > 0 OR due_90_plus > 0
      ORDER BY s.current_balance DESC
    `).all();
    return res.json({ success: true, aging: rows });
  } catch (error) {
    console.error('Supplier aging error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch supplier aging' });
  }
};
