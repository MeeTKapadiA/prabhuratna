const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public route for customer website
router.get('/public', productController.getPublicCatalogProducts);

// Authenticated read routes (staff may view catalog)
router.get('/', authenticateToken, productController.getAllProducts);
router.get('/alerts/low-stock', authenticateToken, productController.getLowStockAlertLink);
router.get('/:id/cost-history', authenticateToken, requireRole(['admin']), productController.getCostHistory);
router.get('/:id', authenticateToken, productController.getProductById);

// Mutations: admin / superadmin only (staff is view-only)
router.post('/', authenticateToken, requireRole(['admin']), productController.createProduct);
router.put('/:id', authenticateToken, requireRole(['admin']), productController.updateProduct);
router.patch('/:id/toggle-website', authenticateToken, requireRole(['admin']), productController.toggleWebsiteVisibility);
router.delete('/:id', authenticateToken, requireRole(['admin']), productController.deleteProduct);

module.exports = router;
