const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

exports.login = (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(loginIdentifier, loginIdentifier);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact System Administrator.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

exports.getMe = (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, username, email, role, status, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching user details' });
  }
};
