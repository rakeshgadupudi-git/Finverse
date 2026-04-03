const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
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
    targetPrice: {
      type: Number,
      required: [true, 'Target price is required'],
      min: [0, 'Target price must be positive'],
    },
    direction: {
      type: String,
      enum: ['ABOVE', 'BELOW'],
      required: [true, 'Direction is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    triggeredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

alertSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Alert', alertSchema);
