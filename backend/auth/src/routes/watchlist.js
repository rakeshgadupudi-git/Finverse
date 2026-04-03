const express = require('express');
const router = express.Router();
const { getWatchlist, addToWatchlist, removeFromWatchlist } = require('../controllers/watchlistController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.delete('/:ticker', removeFromWatchlist);

module.exports = router;
