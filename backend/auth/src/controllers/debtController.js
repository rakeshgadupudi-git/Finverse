const Debt = require('../models/Debt');
const Transaction = require('../models/Transaction');
const { success, error } = require('../utils/response');

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_YEAR = 365.25 * 24 * MS_PER_DAY;

function calcInterest(principal, rate, type, startDate) {
  if (type === 'none' || !rate) return 0;
  const yearsElapsed = (Date.now() - new Date(startDate).getTime()) / MS_PER_YEAR;
  if (type === 'simple') return principal * (rate / 100) * yearsElapsed;
  if (type === 'compound') return principal * (Math.pow(1 + rate / 100, yearsElapsed) - 1);
  return 0;
}

function enrichDebt(debt) {
  const obj = debt.toObject ? debt.toObject() : debt;
  const totalPaid = obj.payments.reduce((s, p) => s + p.amount, 0);
  const interestAccrued = Math.round(calcInterest(obj.principalAmount, obj.interestRate, obj.interestType, obj.startDate));
  const totalOwed = obj.principalAmount + interestAccrued;
  const remainingAmount = Math.max(0, totalOwed - totalPaid);
  const progressPercent = totalOwed > 0 ? Math.min(100, Math.round((totalPaid / totalOwed) * 100)) : 0;

  let daysUntilDue = null;
  let dueDateStatus = 'none';
  if (obj.dueDate) {
    daysUntilDue = Math.ceil((new Date(obj.dueDate) - Date.now()) / MS_PER_DAY);
    if (daysUntilDue < 0) dueDateStatus = 'overdue';
    else if (daysUntilDue <= 7) dueDateStatus = 'due-soon';
    else dueDateStatus = 'upcoming';
  }

  return { ...obj, totalPaid, interestAccrued, totalOwed, remainingAmount, progressPercent, daysUntilDue, dueDateStatus };
}

exports.getDebts = async (req, res) => {
  try {
    const filter = { userId: req.user._id, isActive: true };
    if (req.query.direction) filter.direction = req.query.direction;
    if (req.query.status) filter.status = req.query.status;
    else if (!req.query.all) filter.status = 'active';

    const debts = await Debt.find(filter).sort({ createdAt: -1 });
    const enriched = debts.map(enrichDebt);

    const active = enriched.filter((d) => d.status === 'active');
    const totalBorrowed = active.filter((d) => d.direction === 'BORROWED').reduce((s, d) => s + d.remainingAmount, 0);
    const totalLent = active.filter((d) => d.direction === 'LENT').reduce((s, d) => s + d.remainingAmount, 0);
    const netBalance = totalLent - totalBorrowed;

    return success(res, { debts: enriched, summary: { totalBorrowed, totalLent, netBalance } });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createDebt = async (req, res) => {
  try {
    const { direction, counterpartyName, principalAmount, startDate, dueDate, interestRate, interestType, notes, createTransaction } = req.body;
    if (!direction || !counterpartyName || !principalAmount) {
      return error(res, 'direction, counterpartyName, and principalAmount are required', 400);
    }

    let linkedTxId = null;
    if (createTransaction) {
      const txDesc = direction === 'BORROWED'
        ? `Borrowed from ${counterpartyName}`
        : `Lent to ${counterpartyName}`;
      const tx = await Transaction.create({
        userId: req.user._id,
        description: txDesc,
        amount: principalAmount,
        type: 'EXPENSE',
        category: 'Others',
        date: startDate ? new Date(startDate) : new Date(),
      });
      linkedTxId = tx._id;
    }

    const debt = await Debt.create({
      userId: req.user._id,
      direction,
      counterpartyName,
      principalAmount,
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      interestRate: interestRate || 0,
      interestType: interestType || 'none',
      notes,
      linkedTransactionId: linkedTxId,
    });

    return success(res, { debt: enrichDebt(debt) }, 'Debt created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateDebt = async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!debt) return error(res, 'Debt not found', 404);

    const allowed = ['counterpartyName', 'interestRate', 'interestType', 'dueDate', 'notes', 'status'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) debt[f] = req.body[f]; });
    if (req.body.status === 'closed' && !debt.closedAt) debt.closedAt = new Date();
    if (req.body.status === 'active') debt.closedAt = null;
    await debt.save();
    return success(res, { debt: enrichDebt(debt) }, 'Debt updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.addPayment = async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!debt) return error(res, 'Debt not found', 404);

    const { amount, date, note, createTransaction } = req.body;
    if (!amount || amount <= 0) return error(res, 'amount is required and must be positive', 400);

    let txId = null;
    if (createTransaction) {
      const txDesc = debt.direction === 'BORROWED'
        ? `Repaid to ${debt.counterpartyName}`
        : `Received from ${debt.counterpartyName}`;
      const tx = await Transaction.create({
        userId: req.user._id,
        description: txDesc,
        amount,
        type: 'EXPENSE',
        category: 'Others',
        date: date ? new Date(date) : new Date(),
      });
      txId = tx._id;
    }

    debt.payments.push({ amount, date: date ? new Date(date) : new Date(), note: note || '', txId });

    const enriched = enrichDebt(debt);
    if (enriched.remainingAmount <= 0 && debt.status !== 'closed') {
      debt.status = 'closed';
      debt.closedAt = new Date();
    }
    await debt.save();
    return success(res, { debt: enrichDebt(debt) }, 'Payment added');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!debt) return error(res, 'Debt not found', 404);
    debt.payments.pull({ _id: req.params.paymentId });
    const enriched = enrichDebt(debt);
    if (debt.status === 'closed' && enriched.remainingAmount > 0) {
      debt.status = 'active';
      debt.closedAt = null;
    }
    await debt.save();
    return success(res, { debt: enrichDebt(debt) }, 'Payment deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteDebt = async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!debt) return error(res, 'Debt not found', 404);
    debt.isActive = false;
    await debt.save();
    return success(res, null, 'Debt deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
