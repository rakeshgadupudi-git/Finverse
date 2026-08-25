const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  estimatedPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  actualPrice: {
    type: Number,
    default: null,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  unit: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: String,
    enum: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Rent', 'Utilities', 'Investment', 'Others'],
    default: 'Food',
  },
  checked: {
    type: Boolean,
    default: false,
  },
  convertedTxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
}, { _id: true });

const shoppingListSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Shopping List',
  },
  store: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
  items: [shoppingItemSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

shoppingListSchema.index({ userId: 1, isActive: 1 });
shoppingListSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
