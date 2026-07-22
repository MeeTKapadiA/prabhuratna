const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, quotationController.createQuotation);
router.get('/', authenticateToken, quotationController.getAllQuotations);
router.get('/:id', authenticateToken, quotationController.getQuotationById);
router.put('/:id/status', authenticateToken, quotationController.updateQuotationStatus);

module.exports = router;
