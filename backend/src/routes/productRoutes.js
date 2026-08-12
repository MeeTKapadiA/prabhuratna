const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public route for customer website
router.get('/public', productController.getPublicCatalogProducts);

// Authenticated routes
router.get('/', authenticateToken, productController.getAllProducts);
router.get('/alerts/low-stock', authenticateToken, productController.getLowStockAlertLink);
router.get('/:id/cost-history', authenticateToken, productController.getCostHistory);
router.get('/:id', authenticateToken, productController.getProductById);
router.post('/', authenticateToken, productController.createProduct);
router.put('/:id', authenticateToken, productController.updateProduct);
router.patch('/:id/toggle-website', authenticateToken, productController.toggleWebsiteVisibility);

// Admin-only deletion
router.delete('/:id', authenticateToken, requireRole(['admin']), productController.deleteProduct);

module.exports = router;
