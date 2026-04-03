"""
Standalone training script.
Run this to pre-build and persist the categorizer artifact before starting
the server, or whenever the training data is updated.

Usage:
    python train.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from models.categorizer import TransactionCategorizer

if __name__ == "__main__":
    print("Training TransactionCategorizer…")
    TransactionCategorizer(force_retrain=True)
    print("Done. Artifact saved to backend/ml_service/artifacts/categorizer.pkl")
