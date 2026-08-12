const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/export', authenticateToken, requireRole(['superadmin']), backupController.exportDatabase);
router.get('/export-csv', authenticateToken, requireRole(['superadmin']), backupController.exportCSV);

module.exports = router;
