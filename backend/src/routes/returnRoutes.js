const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken, requireRole(['admin']));
router.post('/', returnController.createReturn);
router.get('/', returnController.getAllReturns);
router.get('/lookup/:invoiceNumber', returnController.lookupInvoiceForReturn);
router.get('/:id', returnController.getReturnById);

module.exports = router;
