const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNoteController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', creditNoteController.getAllCreditNotes);
router.get('/:id', creditNoteController.getCreditNoteById);
router.post('/', creditNoteController.createCreditNote);

module.exports = router;
