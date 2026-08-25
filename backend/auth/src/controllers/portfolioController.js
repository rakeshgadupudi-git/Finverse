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

// GET /api/portfolio/net-worth
const getNetWorth = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return error(res, 'Portfolio not found', 404);
    }

    const holdings = await Holding.find({ portfolioId: portfolio._id, isActive: true });

    if (holdings.length === 0) {
      return success(res, {
        holdings: [],
        totalInvested: 0,
        totalCurrentValue: 0,
        totalPnl: 0,
        pnlPercent: 0,
      });
    }

    const apiBase = process.env.API_SERVICE_URL || 'http://localhost:5000';

    const enriched = await Promise.all(
      holdings.map(async (h) => {
        let currentPrice = null;
        try {
          const resp = await fetch(`${apiBase}/api/live-price?ticker=${encodeURIComponent(h.ticker)}`, {
            signal: AbortSignal.timeout(4000),
          });
          if (resp.ok) {
            const json = await resp.json();
            currentPrice = json?.data?.price ?? null;
          }
        } catch {
          // api service unavailable — leave currentPrice null
        }

        const investedValue = h.quantity * h.buyPrice;
        const currentValue  = currentPrice !== null ? h.quantity * currentPrice : null;
        const pnl           = currentValue  !== null ? currentValue - investedValue : null;

        return {
          _id:          h._id,
          ticker:       h.ticker,
          quantity:     h.quantity,
          buyPrice:     h.buyPrice,
          buyDate:      h.buyDate,
          currentPrice,
          investedValue: parseFloat(investedValue.toFixed(2)),
          currentValue:  currentValue  !== null ? parseFloat(currentValue.toFixed(2))  : null,
          pnl:           pnl           !== null ? parseFloat(pnl.toFixed(2))           : null,
          pnlPercent:    pnl           !== null ? parseFloat(((pnl / investedValue) * 100).toFixed(2)) : null,
        };
      })
    );

    const totalInvested     = enriched.reduce((s, h) => s + h.investedValue, 0);
    const knownCurrentValue = enriched.filter((h) => h.currentValue !== null);
    const totalCurrentValue = knownCurrentValue.length > 0
      ? knownCurrentValue.reduce((s, h) => s + h.currentValue, 0)
      : null;
    const totalPnl          = totalCurrentValue !== null ? totalCurrentValue - totalInvested : null;
    const pnlPercent        = (totalPnl !== null && totalInvested > 0)
      ? parseFloat(((totalPnl / totalInvested) * 100).toFixed(2))
      : null;

    return success(res, {
      holdings:          enriched,
      totalInvested:     parseFloat(totalInvested.toFixed(2)),
      totalCurrentValue: totalCurrentValue !== null ? parseFloat(totalCurrentValue.toFixed(2)) : null,
      totalPnl:          totalPnl          !== null ? parseFloat(totalPnl.toFixed(2))          : null,
      pnlPercent,
      pricesAvailable:   knownCurrentValue.length,
      totalHoldings:     enriched.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPortfolio, addHolding, editHolding, deleteHolding, getAnalytics, getNetWorth };
