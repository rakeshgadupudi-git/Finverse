const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCards, createCard, updateCard, deleteCard } = require('../controllers/loyaltyCardController');

router.use(protect);

router.get('/', getCards);
router.post('/', createCard);
router.patch('/:id', updateCard);
router.delete('/:id', deleteCard);

module.exports = router;
