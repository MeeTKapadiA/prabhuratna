const db = require('../config/db');

function writeAuditLog({
  userId = null,
  username = null,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ip = null
}) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      username,
      action,
      entityType,
      entityId == null ? null : String(entityId),
      typeof details === 'string' ? details : (details ? JSON.stringify(details) : null),
      ip
    );
  } catch (error) {
    console.warn('Audit log write failed:', error.message);
  }
}

function auditFromReq(req, action, entityType, entityId, details) {
  writeAuditLog({
    userId: req.user?.id || null,
    username: req.user?.username || req.user?.email || null,
    action,
    entityType,
    entityId,
    details,
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
  });
}

module.exports = { writeAuditLog, auditFromReq };
