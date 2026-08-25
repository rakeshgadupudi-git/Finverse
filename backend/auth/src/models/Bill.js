const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Bill name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    dueDate: {
      type: Number,   // day of month 1–31
      required: [true, 'Due date (day of month) is required'],
      min: 1,
      max: 31,
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    category: {
      type: String,
      enum: ['Streaming', 'Utilities', 'Insurance', 'EMI', 'Rent', 'Subscription', 'Other'],
      default: 'Other',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastPaidAt: {
      type: Date,
      default: null,
    },
    reminderDaysBefore: {
      type: Number,
      default: 3,
      min: 0,
      max: 30,
    },
  },
  { timestamps: true }
);

billSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Bill', billSchema);
