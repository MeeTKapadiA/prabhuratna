const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users
exports.getAllUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, username, email, role, status, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching users list' });
  }
};

// Create new user (Admin action)
exports.createUser = (req, res) => {
  try {
    const { name, username, email, password, role, status } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const finalUsername = (username || email.split('@')[0]).trim();
    const finalRole = role === 'admin' ? 'admin' : 'staff';
    const finalStatus = status === 'inactive' ? 'inactive' : 'active';

    // Check duplicate email or username
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, finalUsername);
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, finalUsername, email, hashedPassword, finalRole, finalStatus);

    const newUser = db.prepare('SELECT id, name, username, email, role, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: 'Server error creating user' });
  }
};

// Update user details
exports.updateUser = (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, status } = req.body;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check duplicate email/username for other users
    if (email || username) {
      const dup = db.prepare('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?').get(email, username, id);
      if (dup) {
        return res.status(400).json({ success: false, message: 'Email or username already in use by another user.' });
      }
    }

    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          username = COALESCE(?, username),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, username, email, role, status, id);

    const updatedUser = db.prepare('SELECT id, name, username, email, role, status, last_login, created_at FROM users WHERE id = ?').get(id);

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, message: 'Server error updating user' });
  }
};

// Toggle user status (Activate / Deactivate)
exports.toggleUserStatus = (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, status, role FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent self-deactivation if last admin
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, id);

    return res.json({
      success: true,
      message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      status: newStatus
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling user status' });
  }
};

// Reset Password (Admin action)
exports.resetPassword = (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

// Delete user
exports.deleteUser = (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
};
