const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPlannedPayments,
  createPlannedPayment,
  updatePlannedPayment,
  markAsPaid,
  deletePlannedPayment,
} = require('../controllers/plannedPaymentController');

router.use(protect);

router.get('/', getPlannedPayments);
router.post('/', createPlannedPayment);
router.patch('/:id', updatePlannedPayment);
router.post('/:id/pay', markAsPaid);
router.delete('/:id', deletePlannedPayment);

module.exports = router;
