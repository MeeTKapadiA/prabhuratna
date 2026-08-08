const express = require('express');
const router = express.Router();
const cashbookController = require('../controllers/cashbookController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', cashbookController.getCashbook);
router.post('/', cashbookController.saveCashbook);
router.get('/supplier-aging', requireRole(['admin']), cashbookController.getSupplierAging);

module.exports = router;
