const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticker: {
      type: String,
      required: [true, 'Ticker is required'],
      uppercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// A user can only add each ticker once
watchlistSchema.index({ userId: 1, ticker: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
