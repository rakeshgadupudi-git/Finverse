const LoyaltyCard = require('../models/LoyaltyCard');
const { success, error } = require('../utils/response');

exports.getCards = async (req, res) => {
  try {
    const cards = await LoyaltyCard.find({ userId: req.user._id, isActive: true }).sort({ cardName: 1 });
    return success(res, { cards });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createCard = async (req, res) => {
  try {
    const { cardName, issuer, cardType, cardNumber, barcodeValue, barcodeType, expiryDate, color, notes } = req.body;
    if (!cardName) return error(res, 'cardName is required', 400);
    const card = await LoyaltyCard.create({
      userId: req.user._id,
      cardName,
      issuer,
      cardType,
      cardNumber,
      barcodeValue: barcodeValue || cardNumber || '',
      barcodeType,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      color,
      notes,
    });
    return success(res, { card }, 'Card created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateCard = async (req, res) => {
  try {
    const card = await LoyaltyCard.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!card) return error(res, 'Card not found', 404);
    const allowed = ['cardName', 'issuer', 'cardType', 'cardNumber', 'barcodeValue', 'barcodeType', 'expiryDate', 'color', 'notes'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) card[f] = req.body[f]; });
    await card.save();
    return success(res, { card }, 'Card updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const card = await LoyaltyCard.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!card) return error(res, 'Card not found', 404);
    card.isActive = false;
    await card.save();
    return success(res, null, 'Card deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
