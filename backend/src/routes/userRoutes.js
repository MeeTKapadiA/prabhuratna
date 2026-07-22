const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All User Management endpoints require authentication and Admin role
router.use(authenticateToken, requireRole(['admin']));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.toggleUserStatus);
router.post('/:id/reset-password', userController.resetPassword);
router.delete('/:id', userController.deleteUser);

module.exports = router;
