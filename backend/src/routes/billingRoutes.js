const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/invoices', authenticateToken, billingController.createInvoice);
router.get('/invoices', authenticateToken, billingController.getAllInvoices);
router.get('/invoices/:id', authenticateToken, billingController.getInvoiceById);
router.post('/invoices/:id/payments', authenticateToken, billingController.recordInvoicePayment);
router.post('/invoices/:id/cancel', authenticateToken, requireRole(['admin']), billingController.cancelInvoice);

router.post('/', authenticateToken, billingController.createInvoice);
router.get('/', authenticateToken, billingController.getAllInvoices);
router.get('/:id', authenticateToken, billingController.getInvoiceById);
router.post('/:id/payments', authenticateToken, billingController.recordInvoicePayment);
router.post('/:id/cancel', authenticateToken, requireRole(['admin']), billingController.cancelInvoice);

module.exports = router;
