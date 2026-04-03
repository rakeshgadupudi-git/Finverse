const express = require('express');
const router = express.Router();
const {
  getTransactions,
  addTransaction,
  editTransaction,
  deleteTransaction,
  exportTransactions,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getTransactions);
router.get('/export', exportTransactions);
router.post('/', addTransaction);
router.patch('/:transactionId', editTransaction);
router.delete('/:transactionId', deleteTransaction);

module.exports = router;
