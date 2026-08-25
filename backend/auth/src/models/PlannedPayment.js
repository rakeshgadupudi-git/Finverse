const mongoose = require('mongoose');

const plannedPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    enum: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Rent', 'Utilities', 'Investment', 'Others'],
    default: 'Others',
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  reminderDaysBefore: {
    type: Number,
    default: 3,
    min: 0,
    max: 30,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
  },
  convertedTxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

plannedPaymentSchema.index({ userId: 1, isActive: 1 });
plannedPaymentSchema.index({ userId: 1, scheduledDate: 1 });
plannedPaymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PlannedPayment', plannedPaymentSchema);
