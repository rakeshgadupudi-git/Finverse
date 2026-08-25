const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getWarranties, createWarranty, updateWarranty, deleteWarranty } = require('../controllers/warrantyController');

router.use(protect);

router.get('/', getWarranties);
router.post('/', createWarranty);
router.patch('/:id', updateWarranty);
router.delete('/:id', deleteWarranty);

module.exports = router;
