"""
Transaction Categorizer
TF-IDF + Random Forest pipeline trained on labeled Indian financial transaction descriptions.
Artifacts are persisted to disk so the model survives restarts without retraining.
"""

import os
import pickle

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline

_ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
_MODEL_PATH = os.path.join(_ARTIFACTS_DIR, "categorizer.pkl")
_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "transactions_labeled.csv")


class TransactionCategorizer:
    """
    Predicts the spending category from a raw transaction description string.

    Usage:
        c = TransactionCategorizer()
        category, confidence = c.predict("Swiggy Order")
        # → ("Food", 0.97)
    """

    def __init__(self, force_retrain: bool = False):
        self._pipeline: Pipeline | None = None
        self._trained = False

        if not force_retrain and os.path.exists(_MODEL_PATH):
            self._load()
        else:
            self._train()

    # ── Public API ────────────────────────────────────────────────────────────

    def predict(self, description: str) -> tuple[str, float]:
        if not self._trained:
            raise RuntimeError("Categorizer not trained")
        proba = self._pipeline.predict_proba([description])[0]
        idx = int(np.argmax(proba))
        return self._pipeline.classes_[idx], float(proba[idx])

    def is_trained(self) -> bool:
        return self._trained

    # ── Internal ──────────────────────────────────────────────────────────────

    def _train(self):
        if not os.path.exists(_DATA_PATH):
            raise FileNotFoundError(f"Training data not found at {_DATA_PATH}")

        df = pd.read_csv(_DATA_PATH)
        df = df.dropna(subset=["description", "category"])

        self._pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                ngram_range=(1, 2),
                max_features=8000,
                sublinear_tf=True,
            )),
            ("clf", RandomForestClassifier(
                n_estimators=200,
                max_depth=None,
                min_samples_leaf=1,
                random_state=42,
                n_jobs=-1,
            )),
        ])
        self._pipeline.fit(df["description"], df["category"])

        os.makedirs(_ARTIFACTS_DIR, exist_ok=True)
        with open(_MODEL_PATH, "wb") as f:
            pickle.dump(self._pipeline, f)

        self._trained = True
        print(f"[Categorizer] Trained on {len(df)} examples → saved to {_MODEL_PATH}")

    def _load(self):
        with open(_MODEL_PATH, "rb") as f:
            self._pipeline = pickle.load(f)
        self._trained = True
        print(f"[Categorizer] Loaded from {_MODEL_PATH}")
