from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from classifier import TransactionClassifier


MODEL_PATH = Path(
    os.environ.get("CATEGORIZER_MODEL_PATH", Path(__file__).with_name("params.pt"))
)

app = FastAPI(title="Lumen transaction categorizer", version="1.0.0")
_classifier: TransactionClassifier | None = None


class TransactionIn(BaseModel):
    description: str = Field(min_length=1)
    amount: float | None = None
    completed_date: str | None = None


class PredictRequest(BaseModel):
    transactions: list[TransactionIn]
    top_k: int = Field(default=1, ge=1, le=3)


class CategoryScore(BaseModel):
    category: str
    confidence: float


class Prediction(BaseModel):
    category: str
    confidence: float
    top3: list[CategoryScore] | None = None


class PredictResponse(BaseModel):
    predictions: list[Prediction]


def get_classifier() -> TransactionClassifier:
    global _classifier
    if _classifier is None:
        _classifier = TransactionClassifier(MODEL_PATH)
    return _classifier


def to_model_input(transaction: TransactionIn) -> list[str | float]:
    if transaction.amount is None:
        return [transaction.description]
    if transaction.completed_date:
        return [transaction.description, transaction.amount, transaction.completed_date]
    return [transaction.description, transaction.amount]


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "ok": MODEL_PATH.exists(),
        "model_path": str(MODEL_PATH),
        "model_loaded": _classifier is not None,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    if not request.transactions:
        return PredictResponse(predictions=[])

    model_input = [to_model_input(transaction) for transaction in request.transactions]

    try:
        classifier = get_classifier()
        if request.top_k >= 3:
            top3_rows = classifier.predict_top3(model_input)
            predictions = []
            for row in top3_rows:
                scores = [
                    CategoryScore(category=category, confidence=float(confidence))
                    for category, confidence in row
                ]
                predictions.append(
                    Prediction(
                        category=scores[0].category,
                        confidence=scores[0].confidence,
                        top3=scores,
                    )
                )
            return PredictResponse(predictions=predictions)

        scored = classifier.predict_with_scores(model_input)
        return PredictResponse(
            predictions=[
                Prediction(category=category, confidence=float(confidence))
                for category, confidence in scored
            ]
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
