const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, categoryController.getAllCategories);
router.post('/', authenticateToken, requireRole(['admin']), categoryController.createCategory);
router.put('/:id', authenticateToken, requireRole(['admin']), categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireRole(['admin']), categoryController.deleteCategory);

module.exports = router;
