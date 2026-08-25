const mongoose = require('mongoose');

const loyaltyCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cardName: {
    type: String,
    required: true,
    trim: true,
  },
  issuer: {
    type: String,
    default: '',
    trim: true,
  },
  cardType: {
    type: String,
    enum: ['Loyalty', 'Credit', 'Debit', 'Membership', 'Gift', 'Other'],
    default: 'Loyalty',
  },
  cardNumber: {
    type: String,
    default: '',
    trim: true,
  },
  barcodeValue: {
    type: String,
    default: '',
  },
  barcodeType: {
    type: String,
    enum: ['CODE128', 'EAN13', 'QR', 'NONE'],
    default: 'CODE128',
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  color: {
    type: String,
    default: '#00d4aa',
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

loyaltyCardSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('LoyaltyCard', loyaltyCardSchema);
