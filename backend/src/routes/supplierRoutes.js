const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, supplierController.createSupplier);
router.get('/', authenticateToken, supplierController.getAllSuppliers);
router.get('/:id', authenticateToken, supplierController.getSupplierById);
router.put('/:id', authenticateToken, supplierController.updateSupplier);

module.exports = router;
