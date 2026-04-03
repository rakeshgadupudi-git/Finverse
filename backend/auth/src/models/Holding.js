const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: true,
    },
    ticker: {
      type: String,
      required: [true, 'Ticker is required'],
      uppercase: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.001, 'Quantity must be positive'],
    },
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
      min: [0, 'Buy price must be positive'],
    },
    buyDate: {
      type: Date,
      required: [true, 'Buy date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

holdingSchema.index({ portfolioId: 1, isActive: 1 });

module.exports = mongoose.model('Holding', holdingSchema);
