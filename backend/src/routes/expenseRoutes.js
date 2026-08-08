const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', expenseController.getExpenses);
router.post('/', requireRole(['admin']), expenseController.createExpense);
router.delete('/:id', requireRole(['admin']), expenseController.deleteExpense);

module.exports = router;
