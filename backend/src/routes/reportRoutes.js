const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All Reports endpoints are restricted to Admin role only
router.use(authenticateToken, requireRole(['admin']));

router.get('/sales', reportController.getSalesReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/profit', reportController.getProfitReport);

module.exports = router;
