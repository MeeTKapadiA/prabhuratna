const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Staff: view stock + adjust + logs. Analytics / reconciliation: admin+
router.post('/adjust', authenticateToken, inventoryController.adjustStock);
router.get('/logs', authenticateToken, inventoryController.getInventoryLogs);
router.get('/fast-moving', authenticateToken, requireRole(['admin']), inventoryController.getFastMovingProducts);
router.get('/slow-moving', authenticateToken, requireRole(['admin']), inventoryController.getSlowMovingProducts);
router.get('/reconciliation', authenticateToken, requireRole(['admin']), inventoryController.getReconciliationReport);

module.exports = router;
