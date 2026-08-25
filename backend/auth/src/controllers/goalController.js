const Goal = require('../models/Goal');
const { success, error } = require('../utils/response');

// Derive calculated fields for a goal
function deriveGoalFields(goal) {
  const now = new Date();
  const target = new Date(goal.targetDate);

  const totalMs = target - now;
  const monthsRemaining = Math.max(0, Math.ceil(totalMs / (1000 * 60 * 60 * 24 * 30)));
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const requiredMonthlyContribution = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;

  // onTrack: ratio saved >= ratio of time elapsed
  const createdAt = new Date(goal.createdAt || now);
  const totalDuration = target - createdAt;
  const elapsed = now - createdAt;
  const timeRatio = totalDuration > 0 ? Math.min(1, elapsed / totalDuration) : 0;
  const saveRatio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const onTrack = saveRatio >= timeRatio;

  // Projected completion date if user saves requiredMonthly
  const projectedMonths = requiredMonthlyContribution > 0
    ? Math.ceil(remaining / requiredMonthlyContribution)
    : 0;
  const projectedCompletion = new Date(now.getTime() + projectedMonths * 30 * 24 * 60 * 60 * 1000);

  return {
    monthsRemaining,
    requiredMonthlyContribution: Math.round(requiredMonthlyContribution),
    projectedCompletion,
    onTrack,
    progressPercent: goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0,
  };
}

// GET /api/goals
const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: req.user._id, isActive: true }).sort({ targetDate: 1 });

    const enriched = goals.map((g) => ({
      ...g.toObject(),
      ...deriveGoalFields(g),
    }));

    return success(res, { goals: enriched });
  } catch (err) {
    next(err);
  }
};

// POST /api/goals
const createGoal = async (req, res, next) => {
  try {
    const { title, targetAmount, currentAmount, targetDate, category, monthlyContribution, notes } = req.body;

    if (!title || !targetAmount || !targetDate) {
      return error(res, 'title, targetAmount, and targetDate are required', 400);
    }

    const goal = await Goal.create({
      userId: req.user._id,
      title,
      targetAmount,
      currentAmount: currentAmount || 0,
      targetDate: new Date(targetDate),
      category: category || 'Other',
      monthlyContribution: monthlyContribution || 0,
      notes: notes || '',
    });

    return success(
      res,
      { goal: { ...goal.toObject(), ...deriveGoalFields(goal) } },
      'Goal created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/goals/:goalId
const updateGoal = async (req, res, next) => {
  try {
    const { goalId } = req.params;
    const allowed = ['title', 'targetAmount', 'currentAmount', 'targetDate', 'category', 'monthlyContribution', 'notes', 'isCompleted'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (updates.targetDate) updates.targetDate = new Date(updates.targetDate);
    if (updates.currentAmount !== undefined && updates.targetAmount !== undefined) {
      updates.isCompleted = updates.currentAmount >= updates.targetAmount;
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, userId: req.user._id, isActive: true },
      updates,
      { new: true, runValidators: true }
    );

    if (!goal) return error(res, 'Goal not found', 404);

    return success(res, { goal: { ...goal.toObject(), ...deriveGoalFields(goal) } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/goals/:goalId
const deleteGoal = async (req, res, next) => {
  try {
    const { goalId } = req.params;
    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, userId: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!goal) return error(res, 'Goal not found', 404);

    return success(res, {}, 'Goal deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };
