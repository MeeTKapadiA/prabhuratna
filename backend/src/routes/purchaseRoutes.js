const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken, requireRole(['admin']));
router.post('/', purchaseController.createPurchase);
router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/:id/payments', purchaseController.recordPurchasePayment);

module.exports = router;
