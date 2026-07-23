const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, returnController.createReturn);
router.get('/', authenticateToken, returnController.getAllReturns);
router.get('/lookup/:invoiceNumber', authenticateToken, returnController.lookupInvoiceForReturn);
router.get('/:id', authenticateToken, returnController.getReturnById);

module.exports = router;
