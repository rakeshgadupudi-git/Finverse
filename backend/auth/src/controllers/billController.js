const Bill = require('../models/Bill');
const { success, error } = require('../utils/response');

// Compute next due date given a bill's dueDate (day) and frequency
function getNextDueDate(bill, from = new Date()) {
  const now = new Date(from);
  const day = bill.dueDate;

  // Build a candidate date in the current month
  const candidate = new Date(now.getFullYear(), now.getMonth(), day);

  if (bill.frequency === 'monthly') {
    if (candidate <= now) {
      // Already passed this month — move to next month
      return new Date(now.getFullYear(), now.getMonth() + 1, day);
    }
    return candidate;
  }

  if (bill.frequency === 'quarterly') {
    // Advance by months until we find a future date
    let d = candidate;
    while (d <= now) {
      d = new Date(d.getFullYear(), d.getMonth() + 3, day);
    }
    return d;
  }

  if (bill.frequency === 'yearly') {
    let d = candidate;
    while (d <= now) {
      d = new Date(d.getFullYear() + 1, d.getMonth(), day);
    }
    return d;
  }

  return candidate;
}

function enrichBill(bill) {
  const nextDue = getNextDueDate(bill);
  const today = new Date();
  const daysUntil = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
  let status = 'upcoming';
  if (daysUntil < 0) status = 'overdue';
  else if (daysUntil === 0) status = 'due-today';
  return { ...bill.toObject(), nextDueDate: nextDue, daysUntil, status };
}

// GET /api/bills
const getBills = async (req, res, next) => {
  try {
    const bills = await Bill.find({ userId: req.user._id, isActive: true });
    const enriched = bills.map(enrichBill).sort((a, b) => a.nextDueDate - b.nextDueDate);
    return success(res, { bills: enriched });
  } catch (err) {
    next(err);
  }
};

// POST /api/bills
const createBill = async (req, res, next) => {
  try {
    const { name, amount, dueDate, frequency, category, reminderDaysBefore } = req.body;
    if (!name || amount === undefined || !dueDate) {
      return error(res, 'name, amount, and dueDate are required', 400);
    }
    const bill = await Bill.create({
      userId: req.user._id,
      name, amount, dueDate, frequency, category,
      reminderDaysBefore: reminderDaysBefore !== undefined ? reminderDaysBefore : 3,
    });
    return success(res, { bill: enrichBill(bill) }, 'Bill created', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/bills/:id
const updateBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'amount', 'dueDate', 'frequency', 'category', 'reminderDaysBefore', 'lastPaidAt'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    // Mark as paid shortcut
    if (req.body.markPaid) {
      updates.lastPaidAt = new Date();
    }

    const bill = await Bill.findOneAndUpdate(
      { _id: id, userId: req.user._id, isActive: true },
      updates,
      { new: true, runValidators: true }
    );
    if (!bill) return error(res, 'Bill not found', 404);
    return success(res, { bill: enrichBill(bill) });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/bills/:id
const deleteBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!bill) return error(res, 'Bill not found', 404);
    return success(res, {}, 'Bill removed');
  } catch (err) {
    next(err);
  }
};

module.exports = { getBills, createBill, updateBill, deleteBill, getNextDueDate };
