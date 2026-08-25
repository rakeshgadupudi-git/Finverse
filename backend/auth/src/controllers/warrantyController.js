const Warranty = require('../models/Warranty');
const { success, error } = require('../utils/response');

function enrichWarranty(warranty) {
  const obj = warranty.toObject ? warranty.toObject() : warranty;
  const expiryDate = new Date(obj.purchaseDate);
  expiryDate.setMonth(expiryDate.getMonth() + obj.warrantyMonths);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  const monthsUntilExpiry = Math.ceil(daysUntilExpiry / 30);
  let status;
  if (daysUntilExpiry < 0) status = 'expired';
  else if (monthsUntilExpiry <= obj.reminderMonthsBefore) status = 'expiring-soon';
  else status = 'active';
  return { ...obj, expiryDate, daysUntilExpiry, monthsUntilExpiry, status };
}

exports.getWarranties = async (req, res) => {
  try {
    const warranties = await Warranty.find({ userId: req.user._id, isActive: true }).sort({ purchaseDate: -1 });
    const enriched = warranties.map(enrichWarranty);
    enriched.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    return success(res, { warranties: enriched });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createWarranty = async (req, res) => {
  try {
    const { productName, purchaseDate, warrantyMonths, brand, itemType, serialNumber, notes, linkedTransactionId, reminderMonthsBefore } = req.body;
    if (!productName || !purchaseDate || !warrantyMonths) {
      return error(res, 'productName, purchaseDate, and warrantyMonths are required', 400);
    }
    const warranty = await Warranty.create({
      userId: req.user._id,
      productName,
      purchaseDate: new Date(purchaseDate),
      warrantyMonths: Number(warrantyMonths),
      brand,
      itemType,
      serialNumber,
      notes,
      linkedTransactionId: linkedTransactionId || null,
      reminderMonthsBefore,
    });
    return success(res, { warranty: enrichWarranty(warranty) }, 'Warranty created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateWarranty = async (req, res) => {
  try {
    const warranty = await Warranty.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!warranty) return error(res, 'Warranty not found', 404);
    const allowed = ['productName', 'brand', 'itemType', 'purchaseDate', 'warrantyMonths', 'serialNumber', 'notes', 'linkedTransactionId', 'reminderMonthsBefore', 'receiptImageUrl'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) warranty[f] = req.body[f]; });
    await warranty.save();
    return success(res, { warranty: enrichWarranty(warranty) }, 'Warranty updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteWarranty = async (req, res) => {
  try {
    const warranty = await Warranty.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!warranty) return error(res, 'Warranty not found', 404);
    warranty.isActive = false;
    await warranty.save();
    return success(res, null, 'Warranty deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
