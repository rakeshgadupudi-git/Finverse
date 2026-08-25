const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getDebts,
  createDebt,
  updateDebt,
  addPayment,
  deletePayment,
  deleteDebt,
} = require('../controllers/debtController');

router.use(protect);

router.get('/', getDebts);
router.post('/', createDebt);
router.patch('/:id', updateDebt);
router.delete('/:id', deleteDebt);
router.post('/:id/payments', addPayment);
router.delete('/:id/payments/:paymentId', deletePayment);

module.exports = router;
