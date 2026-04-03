"""
FinTracker ML Microservice
FastAPI service exposing ML-powered financial intelligence endpoints.
All endpoints have rule-based counterparts in the Node.js backend as fallback.
"""

import os
from contextlib import asynccontextmanager
from typing import List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from models.anomaly import AnomalyDetector
from models.categorizer import TransactionCategorizer
from models.forecaster import SpendingForecaster
from models.health_scorer import HealthScorer

load_dotenv()

# ── Model singletons (loaded once at startup) ────────────────────────────────

categorizer: TransactionCategorizer
anomaly_detector: AnomalyDetector
forecaster: SpendingForecaster
health_scorer: HealthScorer


@asynccontextmanager
async def lifespan(app: FastAPI):
    global categorizer, anomaly_detector, forecaster, health_scorer
    force_retrain = os.getenv("FORCE_RETRAIN", "false").lower() == "true"
    print("[ML] Loading models…")
    categorizer = TransactionCategorizer(force_retrain=force_retrain)
    anomaly_detector = AnomalyDetector()
    forecaster = SpendingForecaster()
    health_scorer = HealthScorer()
    print("[ML] All models ready.")
    yield


app = FastAPI(
    title="FinTracker ML Service",
    version="1.0.0",
    description="Machine learning microservice for financial intelligence",
    lifespan=lifespan,
)


# ── Request / Response schemas ───────────────────────────────────────────────

class CategoryRequest(BaseModel):
    description: str


class CategoryResponse(BaseModel):
    category: str
    confidence: float
    source: str = "ml"


class Transaction(BaseModel):
    id: Optional[int] = None
    amount: float
    category: Optional[str] = None
    type: str       # "income" | "expense"
    description: str
    date: str       # "YYYY-MM-DD"


class AnomalyRequest(BaseModel):
    transactions: List[Transaction]


class MonthlyPoint(BaseModel):
    month: str
    expenses: float


class ForecastRequest(BaseModel):
    monthly_data: List[MonthlyPoint]


class ForecastResponse(BaseModel):
    predictedExpense: float
    trend: str
    pctChange: float


class HealthRequest(BaseModel):
    transactions: List[Transaction]


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "models": {
            "categorizer": categorizer.is_trained(),
            "anomaly_detector": True,
            "forecaster": True,
            "health_scorer": True,
        },
    }


@app.post("/predict/category", response_model=CategoryResponse)
def predict_category(req: CategoryRequest):
    if not categorizer.is_trained():
        raise HTTPException(status_code=503, detail="Categorizer model not trained yet")
    category, confidence = categorizer.predict(req.description)
    return CategoryResponse(category=category, confidence=round(confidence, 4))


@app.post("/predict/anomalies")
def predict_anomalies(req: AnomalyRequest):
    txs = [t.model_dump() for t in req.transactions]
    anomalies = anomaly_detector.detect(txs)
    return {"anomalies": anomalies}


@app.post("/predict/forecast", response_model=ForecastResponse)
def predict_forecast(req: ForecastRequest):
    data = [m.model_dump() for m in req.monthly_data]
    result = forecaster.predict(data)
    return ForecastResponse(**result)


@app.post("/predict/health")
def predict_health(req: HealthRequest):
    txs = [t.model_dump() for t in req.transactions]
    return health_scorer.score(txs)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
