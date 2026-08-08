const db = require('../config/db');

exports.getAuditLogs = (req, res) => {
  try {
    const { search, action, limit = 100 } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (search) {
      query += ' AND (username LIKE ? OR action LIKE ? OR entity_type LIKE ? OR details LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(Math.min(500, Number.parseInt(limit, 10) || 100));
    const logs = db.prepare(query).all(...params);
    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};
