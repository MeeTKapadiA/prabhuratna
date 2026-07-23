const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/export', authenticateToken, requireRole(['admin']), backupController.exportDatabase);
router.get('/export-csv', authenticateToken, requireRole(['admin']), backupController.exportCSV);

module.exports = router;
