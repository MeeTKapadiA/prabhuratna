const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');

router.post('/adjust', authenticateToken, inventoryController.adjustStock);
router.get('/logs', authenticateToken, inventoryController.getInventoryLogs);
router.get('/fast-moving', authenticateToken, inventoryController.getFastMovingProducts);
router.get('/slow-moving', authenticateToken, inventoryController.getSlowMovingProducts);

module.exports = router;
