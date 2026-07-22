const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Public route for customer website
router.get('/public', productController.getPublicCatalogProducts);

// Admin authenticated routes
router.get('/', authenticateToken, productController.getAllProducts);
router.get('/barcode/:barcode', authenticateToken, productController.getProductByBarcode);
router.get('/:id', authenticateToken, productController.getProductById);
router.post('/', authenticateToken, productController.createProduct);
router.put('/:id', authenticateToken, productController.updateProduct);
router.patch('/:id/toggle-website', authenticateToken, productController.toggleWebsiteVisibility);
router.delete('/:id', authenticateToken, productController.deleteProduct);

module.exports = router;
