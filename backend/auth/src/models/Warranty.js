const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  brand: {
    type: String,
    default: '',
    trim: true,
  },
  itemType: {
    type: String,
    enum: ['Electronics', 'Appliances', 'Furniture', 'Vehicle', 'Jewelry', 'Other'],
    default: 'Electronics',
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  warrantyMonths: {
    type: Number,
    required: true,
    min: 1,
  },
  serialNumber: {
    type: String,
    default: '',
    trim: true,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  linkedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  receiptImageUrl: {
    type: String,
    default: '',
  },
  reminderMonthsBefore: {
    type: Number,
    default: 1,
    min: 0,
    max: 12,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

warrantySchema.index({ userId: 1, isActive: 1 });
warrantySchema.index({ userId: 1, purchaseDate: -1 });

module.exports = mongoose.model('Warranty', warrantySchema);
