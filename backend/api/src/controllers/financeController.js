/**
 * Finance Controller
 * Exposes ML-powered (with rule-based fallback) financial intelligence
 * endpoints consumed by the frontend.
 */

import { calcBudgets } from '../services/financeEngine.js';
import {
  categorize,
  detectAnomaliesML,
  forecastNextMonth,
  getHealthScore,
  isMLServiceAvailable,
} from '../services/mlService.js';

// ── POST /api/finance/categorize ─────────────────────────────────────────────

export const categorizeTransaction = async (req, res) => {
  const { description } = req.body ?? {};
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  const result = await categorize(description);

  if (result) {
    return res.json(result);   // { category, confidence, source: "ml" }
  }
  // Low confidence or ML unavailable — let the client handle manual categorisation
  return res.json({ category: null, confidence: 0, source: 'fallback' });
};

// ── POST /api/finance/anomalies ──────────────────────────────────────────────

export const getAnomalies = async (req, res) => {
  const { transactions } = req.body ?? {};
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions array is required' });
  }

  const anomalies = await detectAnomaliesML(transactions);
  return res.json({ anomalies });
};

// ── POST /api/finance/forecast ───────────────────────────────────────────────

export const getForecast = async (req, res) => {
  const { monthlyData } = req.body ?? {};
  if (!Array.isArray(monthlyData)) {
    return res.status(400).json({ error: 'monthlyData array is required' });
  }

  const result = await forecastNextMonth(monthlyData);
  return res.json(result);
};

// ── POST /api/finance/health-score ───────────────────────────────────────────

export const getFinanceHealthScore = async (req, res) => {
  const { transactions } = req.body ?? {};
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions array is required' });
  }

  const result = await getHealthScore(transactions);
  return res.json(result);
};

// ── POST /api/finance/budgets ────────────────────────────────────────────────

export const getBudgets = (req, res) => {
  const { transactions } = req.body ?? {};
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions array is required' });
  }

  return res.json({ budgets: calcBudgets(transactions) });
};

// ── GET /api/finance/ml-status ───────────────────────────────────────────────

export const getMLStatus = async (_req, res) => {
  const available = await isMLServiceAvailable();
  return res.json({ ml_available: available });
};
