/**
 * ML Service Bridge
 * Thin wrapper around the Python FastAPI ML microservice.
 * Every public function has a built-in fallback to the rule-based
 * financeEngine.js so the Node backend stays fully operational even
 * when the ML service is down or unreachable.
 */

import { calcHealthScore, detectAnomalies, predictNextMonth } from './financeEngine.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS  = 3000;   // abort if ML service doesn't respond in 3 s

// ── Internal fetch helper ────────────────────────────────────────────────────

async function mlPost(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_SERVICE_URL}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`ML service responded ${res.status}`);
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;   // caller must handle null → fallback
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Predict the category for a single transaction description.
 * Returns { category, confidence, source } or null when ML is unavailable /
 * confidence is too low (< 80 %).
 */
export async function categorize(description) {
  const result = await mlPost('/predict/category', { description });
  if (!result || result.confidence < 0.80) return null;
  return { category: result.category, confidence: result.confidence, source: 'ml' };
}

/**
 * Detect spending anomalies in a transaction list.
 * Falls back to the rule-based detectAnomalies() on ML failure.
 */
export async function detectAnomaliesML(transactions) {
  const result = await mlPost('/predict/anomalies', { transactions });
  if (!result) return detectAnomalies(transactions);
  return result.anomalies;
}

/**
 * Forecast next-month spending from an array of monthly data points.
 * Falls back to the rule-based predictNextMonth() on ML failure.
 *
 * @param {Array<{month: string, expenses: number}>} monthlyData
 */
export async function forecastNextMonth(monthlyData) {
  const result = await mlPost('/predict/forecast', { monthly_data: monthlyData });
  if (!result) return predictNextMonth(monthlyData);
  return result;
}

/**
 * Score the user's financial health from their transaction history.
 * Falls back to the rule-based calcHealthScore() on ML failure.
 */
export async function getHealthScore(transactions) {
  const result = await mlPost('/predict/health', { transactions });
  if (!result) return calcHealthScore(transactions);
  return result;
}

/**
 * Quick liveness check against the ML service /health endpoint.
 * Returns true if the service is up and all models are loaded.
 */
export async function isMLServiceAvailable() {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
