"""
Spending Anomaly Detector
Isolation Forest on multidimensional transaction features.
Replaces the hard-coded 1.8× category-average threshold in financeEngine.js.
Falls back to rule-based logic when there are fewer than 10 expense transactions.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

_CATEGORY_INDEX: dict[str, int] = {
    "Food": 0,
    "Rent": 1,
    "Travel": 2,
    "Shopping": 3,
    "Investment": 4,
    "Entertainment": 5,
    "Healthcare": 6,
    "Utilities": 7,
    "Education": 8,
    "Others": 9,
}

_MIN_SAMPLES_FOR_ML = 10   # below this, fall back to rule-based


class AnomalyDetector:
    """
    Detects unusual transactions using Isolation Forest.

    The model is fitted on-the-fly per request (no persistent artifact needed
    because it must adapt to each user's own spending patterns).
    """

    # ── Public API ────────────────────────────────────────────────────────────

    def detect(self, transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        expenses = [t for t in transactions if t.get("type") == "expense"]

        if len(expenses) < _MIN_SAMPLES_FOR_ML:
            return self._rule_based(expenses)

        features = np.array([self._featurize(t) for t in expenses], dtype=float)
        scaler = StandardScaler()
        scaled = scaler.fit_transform(features)

        model = IsolationForest(
            contamination=0.1,
            n_estimators=100,
            random_state=42,
        )
        labels = model.fit_predict(scaled)           # -1 = anomaly, 1 = normal
        raw_scores = model.score_samples(scaled)     # more negative = more anomalous

        anomalies: list[dict[str, Any]] = []
        for tx, label, raw_score in zip(expenses, labels, raw_scores):
            if label == -1:
                severity = "critical" if raw_score < -0.15 else "warning"
                anomalies.append({
                    "type": "anomaly",
                    "transaction_id": tx.get("id"),
                    "description": tx.get("description", ""),
                    "amount": tx.get("amount"),
                    "message": (
                        f"Unusual {tx.get('category', 'transaction')}: "
                        f"₹{tx.get('amount', 0):,.0f} on {tx.get('date', '')}"
                    ),
                    "severity": severity,
                    "icon": "⚠",
                    "score": round(float(raw_score), 4),
                })

        # Sort most anomalous first and cap at 5
        anomalies.sort(key=lambda a: a["score"])
        return anomalies[:5]

    # ── Internal ──────────────────────────────────────────────────────────────

    @staticmethod
    def _featurize(tx: dict[str, Any]) -> list[float]:
        """Extract [amount, day_of_week, day_of_month, category_id] from a transaction."""
        try:
            d = datetime.strptime(tx["date"], "%Y-%m-%d")
            dow = float(d.weekday())   # 0 = Monday
            dom = float(d.day)         # 1-31
        except (ValueError, KeyError):
            dow, dom = 3.0, 15.0       # fallback: mid-week, mid-month

        cat_id = float(_CATEGORY_INDEX.get(tx.get("category", "Others"), 9))
        return [float(tx.get("amount", 0)), dow, dom, cat_id]

    @staticmethod
    def _rule_based(expenses: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Original 1.8× heuristic — used when ML has insufficient data."""
        if not expenses:
            return []

        cat_totals: dict[str, float] = {}
        for t in expenses:
            cat = t.get("category", "Others")
            cat_totals[cat] = cat_totals.get(cat, 0.0) + float(t.get("amount", 0))

        total_exp = sum(cat_totals.values())
        avg = total_exp / max(len(cat_totals), 1)

        anomalies: list[dict[str, Any]] = []
        for cat, amt in cat_totals.items():
            ratio = amt / avg if avg > 0 else 0
            if ratio > 1.8:
                anomalies.append({
                    "type": "spike",
                    "message": f"{cat} spending is {round((ratio - 1) * 100)}% above average",
                    "severity": "warning",
                    "icon": "▲",
                })

        return anomalies[:4]
