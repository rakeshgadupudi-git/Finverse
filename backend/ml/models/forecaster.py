"""
Spending Forecaster
Holt's Double Exponential Smoothing (trend + level) for spending prediction.
Replaces the clamped 3-month rolling average in financeEngine.js.

Prophet can be swapped in here once it's installed — the interface is identical.
"""

from __future__ import annotations

from typing import Any

import numpy as np


class SpendingForecaster:
    """
    Predicts next-month spending from a list of monthly expense data points.

    Routing:
      < 2 active months  → return last known value, trend = stable
      2–5 active months  → weighted moving average (recency-biased)
      ≥ 6 active months  → Holt's double exponential smoothing
    """

    def predict(self, monthly_data: list[dict[str, Any]]) -> dict[str, Any]:
        active = [m for m in monthly_data if float(m.get("expenses", 0)) > 0]

        if not active:
            return {"predictedExpense": 0.0, "trend": "stable", "pctChange": 0.0}

        if len(active) == 1:
            return {
                "predictedExpense": float(active[0]["expenses"]),
                "trend": "stable",
                "pctChange": 0.0,
            }

        if len(active) >= 6:
            return self._holt(active)
        return self._weighted_avg(active)

    # ── Methods ───────────────────────────────────────────────────────────────

    @staticmethod
    def _weighted_avg(data: list[dict[str, Any]]) -> dict[str, Any]:
        """Recency-biased weighted moving average (last 6 months)."""
        values = np.array([float(m["expenses"]) for m in data[-6:]])
        weights = np.arange(1, len(values) + 1, dtype=float)
        weights /= weights.sum()
        predicted = max(0.0, float(np.dot(weights, values)))

        last = float(values[-1])
        pct = round((predicted - last) / last * 100, 1) if last > 0 else 0.0
        trend = "up" if pct > 5 else "down" if pct < -5 else "stable"

        return {"predictedExpense": round(predicted, 2), "trend": trend, "pctChange": pct}

    @staticmethod
    def _holt(data: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Holt's Double Exponential Smoothing.
        α (level smoothing) = 0.4 — balances responsiveness vs. stability.
        β (trend smoothing) = 0.3 — dampens trend oscillation.
        """
        values = [float(m["expenses"]) for m in data]
        alpha, beta = 0.4, 0.3

        level = values[0]
        trend = values[1] - values[0]

        for v in values[1:]:
            prev_level = level
            level = alpha * v + (1 - alpha) * (level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend

        predicted = max(0.0, level + trend)
        last = values[-1]
        pct = round((predicted - last) / last * 100, 1) if last > 0 else 0.0
        trend_dir = "up" if pct > 5 else "down" if pct < -5 else "stable"

        return {"predictedExpense": round(predicted, 2), "trend": trend_dir, "pctChange": pct}
