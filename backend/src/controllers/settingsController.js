const db = require('../config/db');

const ALLOWED_SETTING_KEYS = [
  'shop_name',
  'shop_address',
  'shop_phone',
  'shop_email',
  'shop_gstin',
  'shop_state_code',
  'logo_base64',
  'logo_url',
  'invoice_footer_note',
  'owner_whatsapp',
  'low_stock_alert_enabled',
  'bank_name',
  'bank_branch',
  'bank_account_number',
  'bank_ifsc'
];

function readSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  return settings;
}

exports.getSettings = (req, res) => {
  try {
    return res.json({ success: true, settings: readSettings() });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

/** Public branding fields for landing page / unauthenticated UI (no secrets). */
exports.getPublicSettings = (req, res) => {
  try {
    const all = readSettings();
    return res.json({
      success: true,
      settings: {
        shop_name: all.shop_name || '',
        shop_address: all.shop_address || '',
        shop_phone: all.shop_phone || '',
        shop_email: all.shop_email || '',
        shop_gstin: all.shop_gstin || '',
        logo_base64: all.logo_base64 || '',
        logo_url: all.logo_url || '',
        invoice_footer_note: all.invoice_footer_note || ''
      }
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch public settings' });
  }
};

exports.updateSettings = (req, res) => {
  try {
    const payload = req.body.settings || req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ success: false, message: 'Invalid settings payload' });
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')
    `);

    const updateTransaction = db.transaction(() => {
      for (const [key, value] of Object.entries(payload)) {
        if (!ALLOWED_SETTING_KEYS.includes(key)) continue;
        stmt.run(key, typeof value === 'string' ? value : String(value || ''));
      }
    });

    updateTransaction();

    return res.json({ success: true, message: 'Business settings saved successfully', settings: readSettings() });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
