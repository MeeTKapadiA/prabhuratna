const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/auth');

// Support both /api/billing/invoices and /api/invoices
router.post('/invoices', authenticateToken, billingController.createInvoice);
router.get('/invoices', authenticateToken, billingController.getAllInvoices);
router.get('/invoices/:id', authenticateToken, billingController.getInvoiceById);

router.post('/', authenticateToken, billingController.createInvoice);
router.get('/', authenticateToken, billingController.getAllInvoices);
router.get('/:id', authenticateToken, billingController.getInvoiceById);

module.exports = router;
