const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be positive'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    category: {
      type: String,
      enum: ['Emergency Fund', 'Vehicle', 'Home', 'Education', 'Vacation', 'Retirement', 'Wedding', 'Other'],
      default: 'Other',
    },
    monthlyContribution: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, isActive: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);
