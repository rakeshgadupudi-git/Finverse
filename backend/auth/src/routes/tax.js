const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { calculateTax, calculateGST } = require('../controllers/taxController');

router.post('/calculate', protect, calculateTax);
router.post('/gst', calculateGST);   // public — no auth required

module.exports = router;
