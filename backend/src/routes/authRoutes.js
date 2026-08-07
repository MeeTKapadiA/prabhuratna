const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
