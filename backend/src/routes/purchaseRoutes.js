const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, purchaseController.createPurchase);
router.get('/', authenticateToken, purchaseController.getAllPurchases);
router.get('/:id', authenticateToken, purchaseController.getPurchaseById);
router.post('/:id/payments', authenticateToken, purchaseController.recordPurchasePayment);

module.exports = router;
