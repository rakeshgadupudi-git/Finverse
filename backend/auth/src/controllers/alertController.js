const Alert = require('../models/Alert');
const { success, error } = require('../utils/response');

// GET /api/alerts
const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    return success(res, { alerts });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts
const createAlert = async (req, res, next) => {
  try {
    const { ticker, targetPrice, direction } = req.body;

    if (!ticker || !targetPrice || !direction) {
      return error(res, 'ticker, targetPrice, and direction are required', 400);
    }

    const alert = await Alert.create({
      userId: req.user._id,
      ticker: ticker.toUpperCase(),
      targetPrice,
      direction: direction.toUpperCase(),
    });

    return success(res, { alert }, 'Alert created', 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/alerts/:alertId
const deleteAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findOne({ _id: alertId, userId: req.user._id });
    if (!alert) {
      return error(res, 'Alert not found', 404);
    }

    alert.isActive = false;
    await alert.save();

    return success(res, {}, 'Alert deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAlerts, createAlert, deleteAlert };
