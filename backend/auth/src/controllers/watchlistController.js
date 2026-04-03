const Watchlist = require('../models/Watchlist');
const { success, error } = require('../utils/response');

// GET /api/watchlist
const getWatchlist = async (req, res, next) => {
  try {
    const items = await Watchlist.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return success(res, { watchlist: items });
  } catch (err) {
    next(err);
  }
};

// POST /api/watchlist
const addToWatchlist = async (req, res, next) => {
  try {
    const { ticker } = req.body;

    if (!ticker) {
      return error(res, 'ticker is required', 400);
    }

    const item = await Watchlist.create({
      userId: req.user._id,
      ticker: ticker.toUpperCase(),
    });

    return success(res, { item }, 'Added to watchlist', 201);
  } catch (err) {
    if (err.code === 11000) {
      return error(res, 'Already in watchlist', 409);
    }
    next(err);
  }
};

// DELETE /api/watchlist/:ticker
const removeFromWatchlist = async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const deleted = await Watchlist.findOneAndDelete({
      userId: req.user._id,
      ticker: ticker.toUpperCase(),
    });

    if (!deleted) {
      return error(res, 'Ticker not found in watchlist', 404);
    }

    return success(res, {}, 'Removed from watchlist');
  } catch (err) {
    next(err);
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
