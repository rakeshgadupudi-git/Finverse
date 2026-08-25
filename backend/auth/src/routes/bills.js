const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getBills, createBill, updateBill, deleteBill } = require('../controllers/billController');

router.use(protect);

router.get('/',     getBills);
router.post('/',    createBill);
router.patch('/:id', updateBill);
router.delete('/:id', deleteBill);

module.exports = router;
