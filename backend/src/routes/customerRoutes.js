const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Staff may look up / create customers during billing (POS). Full receivables UI is admin+.
router.get('/', customerController.getAllCustomers);
router.get('/receivables', requireRole(['admin']), customerController.getReceivables);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', requireRole(['admin']), customerController.updateCustomer);

module.exports = router;
