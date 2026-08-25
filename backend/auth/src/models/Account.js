const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'salary', 'credit', 'wallet', 'investment', 'loan', 'other'],
    required: true,
  },
  institution: {
    type: String,
    default: '',
    trim: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  creditLimit: {
    type: Number,
    default: 0,
  },
  currentOutstanding: {
    type: Number,
    default: 0,
  },
  color: {
    type: String,
    default: '#00d4aa',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
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

accountSchema.index({ userId: 1, isActive: 1 });
accountSchema.index({ userId: 1, accountType: 1 });

module.exports = mongoose.model('Account', accountSchema);
