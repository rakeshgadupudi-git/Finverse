const Transaction = require('../models/Transaction');
const { success, error } = require('../utils/response');

// GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;

    const filter = { userId: req.user._id, isActive: true };

    if (type) filter.type = type.toUpperCase();
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1 })
        .skip(Number(offset))
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    return success(res, { transactions, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    next(err);
  }
};

// POST /api/transactions
const addTransaction = async (req, res, next) => {
  try {
    const { description, amount, type, date, category } = req.body;

    if (!amount || !type) {
      return error(res, 'amount and type are required', 400);
    }

    let finalCategory = category || 'Uncategorized';
    let categorySource = 'MANUAL';

    // Attempt ML categorization if description given and no category provided
    if (description && !category) {
      try {
        const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const mlRes = await fetch(`${mlUrl}/predict/category`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
          signal: AbortSignal.timeout(3000),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData.confidence >= 0.8) {
            finalCategory = mlData.category;
            categorySource = 'ML';
          } else {
            categorySource = 'RULE';
          }
        }
      } catch {
        // ML service unavailable — use manual
      }
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      description,
      amount,
      type: type.toUpperCase(),
      category: finalCategory,
      categorySource,
      date: date ? new Date(date) : new Date(),
    });

    return success(res, { transaction }, 'Transaction added', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/transactions/:transactionId
const editTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { description, amount, category, date, type } = req.body;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id,
      isActive: true,
    });

    if (!transaction) {
      return error(res, 'Transaction not found', 404);
    }

    if (description !== undefined) transaction.description = description;
    if (amount !== undefined) transaction.amount = amount;
    if (category !== undefined) {
      transaction.category = category;
      transaction.categorySource = 'MANUAL';
    }
    if (date !== undefined) transaction.date = new Date(date);
    if (type !== undefined) transaction.type = type.toUpperCase();

    transaction.isEdited = true;
    await transaction.save();

    return success(res, { transaction });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/transactions/:transactionId
const deleteTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id,
    });

    if (!transaction) {
      return error(res, 'Transaction not found', 404);
    }

    transaction.isActive = false;
    await transaction.save();

    return success(res, {}, 'Transaction deleted');
  } catch (err) {
    next(err);
  }
};

// GET /api/transactions/export?format=csv
const exportTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ date: -1 });

    const header = 'Date,Description,Type,Category,Amount\n';
    const rows = transactions
      .map(
        (t) =>
          `${new Date(t.date).toLocaleDateString()},` +
          `"${(t.description || '').replace(/"/g, '""')}",` +
          `${t.type},` +
          `${t.category},` +
          `${t.amount}`
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    return res.send(header + rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions, addTransaction, editTransaction, deleteTransaction, exportTransactions };
