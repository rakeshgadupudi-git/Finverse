"""
Financial Health Scorer
K-Means clustering against a synthetic reference population.
Replaces the fixed-weight point system (35+25+20+20) in financeEngine.js.

The model is fitted once at startup on a synthetic population of 1,000 user
profiles that represents "realistic" spending behaviours across four tiers
(Excellent / Good / Fair / Poor). A new user's features are projected onto this
population to find the nearest cluster, then a fine-grained score is computed
within that cluster's range using the user's actual savings ratio.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

_N_CLUSTERS = 4
_GRADES = ["Excellent", "Good", "Fair", "Poor"]
_SCORE_RANGES = [(80, 100), (60, 79), (40, 59), (0, 39)]
_COLORS = ["#00d4aa", "#4d9fff", "#f5c842", "#ff5e6c"]


class HealthScorer:
    """
    Scores a user's financial health on a 0-100 scale.

    Features used (all normalised 0-1 before clustering):
      - savings_ratio      : (income - expense) / income
      - expense_diversity  : 1 - (max_category_spend / total_spend)
      - income_consistency : min(1, income_transactions / 4)
      - overspend_ratio    : max(0, -savings) / income  (0 = no overspend)
    """

    def __init__(self):
        self._scaler = StandardScaler()
        self._kmeans = KMeans(n_clusters=_N_CLUSTERS, random_state=42, n_init=10)
        self._cluster_grade: dict[int, dict[str, Any]] = {}
        self._fit_population()

    # ── Public API ────────────────────────────────────────────────────────────

    def score(self, transactions: list[dict[str, Any]]) -> dict[str, Any]:
        if not transactions:
            return self._default()

        feats = self._extract(transactions)
        scaled = self._scaler.transform([feats])
        cluster = int(self._kmeans.predict(scaled)[0])
        grade_info = self._cluster_grade[cluster]

        lo, hi = grade_info["score_range"]
        savings_ratio = max(0.0, min(1.0, feats[0]))
        final_score = int(np.clip(round(lo + savings_ratio * (hi - lo)), lo, hi))

        f1 = round(max(0.0, feats[0]) * 35)
        f2 = round(feats[1] * 25)
        f3 = round(feats[2] * 20)
        f4 = round((1.0 - min(1.0, feats[3])) * 20)

        return {
            "score": final_score,
            "grade": grade_info["grade"],
            "color": grade_info["color"],
            "factors": [
                {"label": "Savings Rate",      "score": f1, "max": 35},
                {"label": "Expense Diversity", "score": f2, "max": 25},
                {"label": "Income Stability",  "score": f3, "max": 20},
                {"label": "No Overspend",      "score": f4, "max": 20},
            ],
        }

    # ── Internal ──────────────────────────────────────────────────────────────

    def _fit_population(self):
        pop = self._synthetic_population()
        scaled = self._scaler.fit_transform(pop)
        self._kmeans.fit(scaled)

        # Map clusters → grades by descending savings_ratio in centroid
        centroids = self._scaler.inverse_transform(self._kmeans.cluster_centers_)
        order = np.argsort(centroids[:, 0])[::-1]   # highest savings_ratio first

        for rank, cluster_id in enumerate(order):
            self._cluster_grade[int(cluster_id)] = {
                "grade": _GRADES[rank],
                "score_range": _SCORE_RANGES[rank],
                "color": _COLORS[rank],
            }

        print("[HealthScorer] Fitted K-Means on synthetic population.")

    @staticmethod
    def _synthetic_population() -> np.ndarray:
        """
        Generate 1,000 synthetic financial profiles across four health tiers.
        Each row: [savings_ratio, diversity, income_consistency, overspend_ratio]
        """
        rng = np.random.default_rng(42)

        excellent = np.column_stack([
            rng.uniform(0.30, 0.60, 250),
            rng.uniform(0.60, 0.92, 250),
            rng.uniform(0.80, 1.00, 250),
            rng.uniform(0.00, 0.05, 250),
        ])
        good = np.column_stack([
            rng.uniform(0.12, 0.35, 250),
            rng.uniform(0.45, 0.70, 250),
            rng.uniform(0.55, 0.85, 250),
            rng.uniform(0.00, 0.15, 250),
        ])
        fair = np.column_stack([
            rng.uniform(0.02, 0.15, 250),
            rng.uniform(0.25, 0.55, 250),
            rng.uniform(0.25, 0.60, 250),
            rng.uniform(0.05, 0.40, 250),
        ])
        poor = np.column_stack([
            rng.uniform(-0.40, 0.05, 250),
            rng.uniform(0.05, 0.40, 250),
            rng.uniform(0.00, 0.30, 250),
            rng.uniform(0.30, 1.00, 250),
        ])

        return np.vstack([excellent, good, fair, poor])

    @staticmethod
    def _extract(transactions: list[dict[str, Any]]) -> list[float]:
        income = sum(float(t["amount"]) for t in transactions if t.get("type") == "income")
        expense = sum(float(t["amount"]) for t in transactions if t.get("type") == "expense")
        savings = income - expense

        savings_ratio = savings / income if income > 0 else 0.0

        cat_totals: dict[str, float] = {}
        for t in transactions:
            if t.get("type") == "expense":
                cat = t.get("category", "Others")
                cat_totals[cat] = cat_totals.get(cat, 0.0) + float(t.get("amount", 0))

        cats = list(cat_totals.values())
        max_cat = max(cats) if cats else 0.0
        diversity = (1.0 - max_cat / expense) if expense > 0 and cats else 0.5

        income_txs = [t for t in transactions if t.get("type") == "income"]
        income_consistency = min(1.0, len(income_txs) / 4.0)

        overspend_ratio = max(0.0, -savings / income) if income > 0 else (1.0 if expense > 0 else 0.0)

        return [savings_ratio, diversity, income_consistency, overspend_ratio]

    @staticmethod
    def _default() -> dict[str, Any]:
        return {
            "score": 0,
            "grade": "Poor",
            "color": "#ff5e6c",
            "factors": [
                {"label": "Savings Rate",      "score": 0, "max": 35},
                {"label": "Expense Diversity", "score": 0, "max": 25},
                {"label": "Income Stability",  "score": 0, "max": 20},
                {"label": "No Overspend",      "score": 0, "max": 20},
            ],
        }
