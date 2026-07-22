const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.get('/sales', authenticateToken, reportController.getSalesReport);
router.get('/inventory', authenticateToken, reportController.getInventoryReport);
router.get('/profit', authenticateToken, reportController.getProfitReport);

module.exports = router;
