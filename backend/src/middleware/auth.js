const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../config/jwt');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token missing or invalid' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = db.prepare(
      'SELECT id, username, email, name, role, status FROM users WHERE id = ?'
    ).get(payload.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Please contact System Administrator.'
      });
    }

    req.user = user;
    next();
  });
}

function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have permission to access this resource.'
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
