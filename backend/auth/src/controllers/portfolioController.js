const Portfolio = require('../models/Portfolio');
const Holding = require('../models/Holding');
const { success, error } = require('../utils/response');

// GET /api/portfolio
const getPortfolio = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });

    if (!portfolio) {
      return error(res, 'Portfolio not found', 404);
    }

    const holdings = await Holding.find({
      portfolioId: portfolio._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    return success(res, { portfolio, holdings });
  } catch (err) {
    next(err);
  }
};

// POST /api/portfolio/holding
const addHolding = async (req, res, next) => {
  try {
    const { ticker, quantity, buyPrice, buyDate } = req.body;

    if (!ticker || !quantity || !buyPrice || !buyDate) {
      return error(res, 'ticker, quantity, buyPrice, and buyDate are required', 400);
    }

    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return error(res, 'Portfolio not found', 404);
    }

    const holding = await Holding.create({
      portfolioId: portfolio._id,
      ticker: ticker.toUpperCase(),
      quantity,
      buyPrice,
      buyDate,
    });

    return success(res, { holding }, 'Holding added', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/portfolio/holding/:holdingId
const editHolding = async (req, res, next) => {
  try {
    const { holdingId } = req.params;
    const { quantity, buyPrice, buyDate } = req.body;

    // Verify ownership through portfolio
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    const holding = await Holding.findOne({ _id: holdingId, portfolioId: portfolio._id, isActive: true });

    if (!holding) {
      return error(res, 'Holding not found', 404);
    }

    if (quantity !== undefined) holding.quantity = quantity;
    if (buyPrice !== undefined) holding.buyPrice = buyPrice;
    if (buyDate !== undefined) holding.buyDate = buyDate;

    await holding.save();

    return success(res, { holding });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/portfolio/holding/:holdingId
const deleteHolding = async (req, res, next) => {
  try {
    const { holdingId } = req.params;

    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    const holding = await Holding.findOne({ _id: holdingId, portfolioId: portfolio._id });

    if (!holding) {
      return error(res, 'Holding not found', 404);
    }

    holding.isActive = false;
    await holding.save();

    return success(res, {}, 'Holding removed');
  } catch (err) {
    next(err);
  }
};

// GET /api/portfolio/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    const holdings = await Holding.find({ portfolioId: portfolio._id, isActive: true });

    let totalInvested = 0;
    const allocation = [];

    holdings.forEach((h) => {
      const invested = h.quantity * h.buyPrice;
      totalInvested += invested;
      allocation.push({ ticker: h.ticker, invested });
    });

    // Weight allocation
    const allocationWithWeight = allocation.map((a) => ({
      ...a,
      weight: totalInvested > 0 ? ((a.invested / totalInvested) * 100).toFixed(2) : 0,
    }));

    return success(res, {
      totalInvested: totalInvested.toFixed(2),
      holdingsCount: holdings.length,
      allocation: allocationWithWeight,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPortfolio, addHolding, editHolding, deleteHolding, getAnalytics };
