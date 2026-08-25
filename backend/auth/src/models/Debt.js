const mongoose = require('mongoose');

const paymentSubSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  note: {
    type: String,
    default: '',
    trim: true,
  },
  txId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
}, { _id: true });

const debtSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  direction: {
    type: String,
    enum: ['BORROWED', 'LENT'],
    required: true,
  },
  counterpartyName: {
    type: String,
    required: true,
    trim: true,
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0,
  },
  interestType: {
    type: String,
    enum: ['none', 'simple', 'compound'],
    default: 'none',
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  payments: [paymentSubSchema],
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  closedAt: {
    type: Date,
    default: null,
  },
  linkedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

debtSchema.index({ userId: 1, isActive: 1 });
debtSchema.index({ userId: 1, direction: 1, status: 1 });

module.exports = mongoose.model('Debt', debtSchema);
