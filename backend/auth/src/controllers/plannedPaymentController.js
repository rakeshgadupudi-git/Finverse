const PlannedPayment = require('../models/PlannedPayment');
const Transaction = require('../models/Transaction');
const { success, error } = require('../utils/response');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function enrichPayment(payment) {
  const now = new Date();
  const daysUntil = Math.ceil((new Date(payment.scheduledDate) - now) / MS_PER_DAY);
  let urgency;
  if (daysUntil < 0) urgency = 'overdue';
  else if (daysUntil <= 7) urgency = 'due-soon';
  else urgency = 'upcoming';
  return { ...payment.toObject(), daysUntil, urgency };
}

exports.getPlannedPayments = async (req, res) => {
  try {
    const filter = { userId: req.user._id, isActive: true };
    if (req.query.status && ['pending', 'paid', 'cancelled'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const payments = await PlannedPayment.find(filter).sort({ scheduledDate: 1 });
    return success(res, { payments: payments.map(enrichPayment) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createPlannedPayment = async (req, res) => {
  try {
    const { title, amount, scheduledDate, category, notes, reminderDaysBefore } = req.body;
    if (!title || !amount || !scheduledDate) {
      return error(res, 'title, amount, and scheduledDate are required', 400);
    }
    const payment = await PlannedPayment.create({
      userId: req.user._id,
      title,
      amount,
      scheduledDate: new Date(scheduledDate),
      category,
      notes,
      reminderDaysBefore,
    });
    return success(res, { payment: enrichPayment(payment) }, 'Planned payment created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updatePlannedPayment = async (req, res) => {
  try {
    const payment = await PlannedPayment.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!payment) return error(res, 'Payment not found', 404);

    const allowed = ['title', 'amount', 'scheduledDate', 'category', 'notes', 'reminderDaysBefore', 'status'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) payment[f] = req.body[f]; });
    await payment.save();
    return success(res, { payment: enrichPayment(payment) }, 'Payment updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    const payment = await PlannedPayment.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!payment) return error(res, 'Payment not found', 404);
    if (payment.status === 'paid') return error(res, 'Payment already marked as paid', 400);

    const tx = await Transaction.create({
      userId: req.user._id,
      description: payment.title,
      amount: payment.amount,
      type: 'EXPENSE',
      category: payment.category,
      date: new Date(),
    });

    payment.status = 'paid';
    payment.convertedTxId = tx._id;
    await payment.save();

    return success(res, { payment: enrichPayment(payment), transaction: tx }, 'Payment marked as paid');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deletePlannedPayment = async (req, res) => {
  try {
    const payment = await PlannedPayment.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!payment) return error(res, 'Payment not found', 404);
    payment.isActive = false;
    await payment.save();
    return success(res, null, 'Payment deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
