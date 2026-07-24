const db = require('../config/db');

exports.getSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

exports.updateSettings = (req, res) => {
  try {
    const payload = req.body.settings || req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings payload' });
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const updateTransaction = db.transaction(() => {
      for (const [key, value] of Object.entries(payload)) {
        stmt.run(key, typeof value === 'string' ? value : String(value || ''));
      }
    });

    updateTransaction();

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return res.json({ success: true, message: 'Business settings saved successfully', settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
