import json
import os
from typing import List, Optional

import httpx
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from training.feature_importance import get_feature_importance
from training.train_pipeline import (
    FEATURE_COLUMNS,
    evaluate_models,
    prepare_training_data,
    save_best_model,
    train_models,
)

app = FastAPI(title="ML Service", version="0.1.0")

DATA_SERVICE_URL = os.getenv("DATA_SERVICE_URL", "http://data-service:8001")
MODELS_DIR = os.getenv("MODELS_DIR", "/app/models_store")


# ── Request / Response schemas ──────────────────────────


class PredictRequest(BaseModel):
    year: int
    month: int
    day: int
    hour: int
    area: int
    vict_age: int = 0
    vict_sex: str = "X"
    lat: float
    lon: float
    is_weekend: bool = False
    is_night: bool = False
    quarter: int = 1


class PredictAreaRiskRequest(BaseModel):
    area_name: str
    period: dict = Field(default_factory=lambda: {"year": 2024, "month": 1})


class TopProbability(BaseModel):
    crime_type: str
    probability: float


# ── Helpers ─────────────────────────────────────────────


def _load_model():
    """Load the saved model, encoders, and metadata from disk."""
    model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    enc_path = os.path.join(MODELS_DIR, "label_encoders.joblib")

    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="No trained model found. Run POST /ml/train first.")

    model = joblib.load(model_path)
    with open(meta_path) as f:
        metadata = json.load(f)
    encoders = joblib.load(enc_path) if os.path.exists(enc_path) else {}
    return model, metadata, encoders


def _encode_input(req: PredictRequest, encoders: dict) -> pd.DataFrame:
    """Convert a prediction request into a feature DataFrame."""
    row = {
        "Year": req.year,
        "Month": req.month,
        "Day": req.day,
        "Hour": req.hour,
        "AREA": req.area,
        "Vict Age": req.vict_age,
        "Vict Sex": req.vict_sex,
        "LAT": req.lat,
        "LON": req.lon,
        "IsWeekend": int(req.is_weekend),
        "IsNight": int(req.is_night),
        "Quarter": req.quarter,
    }
    df = pd.DataFrame([row])

    # Apply saved label encoder for Vict Sex
    if "Vict Sex" in encoders:
        le = encoders["Vict Sex"]
        sex_val = req.vict_sex if req.vict_sex in le.classes_ else "X"
        df["Vict Sex"] = le.transform([sex_val])

    return df[FEATURE_COLUMNS]


# ── Endpoints ───────────────────────────────────────────


@app.get("/ml/health")
async def health():
    return {"status": "ok"}


@app.post("/ml/train")
async def train():
    """Fetch data from data-service, train models, evaluate, and save best."""
    # 1. Fetch all incidents from data-service
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(
            f"{DATA_SERVICE_URL}/data/incidents",
            params={"page": 1, "per_page": 1000},
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"data-service returned {resp.status_code}",
            )
        records = resp.json()

    if not records:
        raise HTTPException(status_code=400, detail="No data available for training")

    df = pd.DataFrame(records)

    # Map response field names to the column names the pipeline expects
    col_map = {
        "dr_no": "DR_NO", "date_occ": "DATE OCC", "year": "Year",
        "month": "Month", "day": "Day", "hour": "Hour", "area": "AREA",
        "area_name": "AREA NAME", "crm_cd": "Crm Cd",
        "crm_cd_desc": "Crm Cd Desc", "vict_age": "Vict Age",
        "vict_sex": "Vict Sex", "lat": "LAT", "lon": "LON",
        "is_weekend": "IsWeekend", "is_night": "IsNight",
        "quarter": "Quarter",
    }
    df = df.rename(columns=col_map)

    # 2. Prepare training data
    X_train, X_test, y_train, y_test, label_encoders = prepare_training_data(df)

    # 3. Train models
    models = train_models(X_train, y_train)

    # 4. Evaluate
    evaluation = evaluate_models(models, X_test, y_test)

    # 5. Save best model
    best_name = save_best_model(models, evaluation, label_encoders, MODELS_DIR)

    return {
        "status": "success",
        "best_model": best_name,
        "accuracy": evaluation[best_name]["accuracy"],
        "models_comparison": {
            name: {"accuracy": info["accuracy"]}
            for name, info in evaluation.items()
        },
    }


@app.post("/ml/predict")
async def predict(req: PredictRequest):
    """Predict crime type for a single incident."""
    model, metadata, encoders = _load_model()
    X = _encode_input(req, encoders)

    prediction = model.predict(X)[0]

    # Probabilities (not all models support predict_proba)
    top_probs: List[dict] = []
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        classes = model.classes_
        sorted_idx = np.argsort(proba)[::-1]
        confidence = float(proba[sorted_idx[0]])
        top_probs = [
            {"crime_type": str(classes[i]), "probability": round(float(proba[i]), 4)}
            for i in sorted_idx[:5]
        ]
    elif hasattr(model, "decision_function"):
        df_vals = model.decision_function(X)[0]
        classes = model.classes_
        sorted_idx = np.argsort(df_vals)[::-1]
        # Convert decision function to pseudo-probabilities via softmax
        exp_vals = np.exp(df_vals - df_vals.max())
        softmax = exp_vals / exp_vals.sum()
        confidence = float(softmax[sorted_idx[0]])
        top_probs = [
            {"crime_type": str(classes[i]), "probability": round(float(softmax[i]), 4)}
            for i in sorted_idx[:5]
        ]

    # Feature contributions
    feature_names = metadata.get("feature_names", FEATURE_COLUMNS)
    contributions = get_feature_importance(model, feature_names)

    return {
        "predicted_crime_type": str(prediction),
        "confidence": round(confidence, 4),
        "top_probabilities": top_probs,
        "feature_contributions": contributions,
    }


@app.post("/ml/predict-area-risk")
async def predict_area_risk(req: PredictAreaRiskRequest):
    """Predict risk level for an area in a given period."""
    year = req.period.get("year", 2024)
    month = req.period.get("month", 1)

    # Fetch historical data for this area from data-service
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{DATA_SERVICE_URL}/data/stats/area-time-matrix",
            params={"area_name": req.area_name},
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"data-service returned {resp.status_code}",
            )
        matrix = resp.json()

    if not matrix:
        raise HTTPException(status_code=404, detail=f"No data for area {req.area_name}")

    # Build time series of monthly counts
    monthly_counts = [entry["count"] for entry in matrix]
    if not monthly_counts:
        raise HTTPException(status_code=400, detail="Insufficient data for prediction")

    mean_count = float(np.mean(monthly_counts))
    std_count = float(np.std(monthly_counts)) if len(monthly_counts) > 1 else 0.0

    # Simple trend-based prediction: last 12 months average + trend
    recent = monthly_counts[-12:] if len(monthly_counts) >= 12 else monthly_counts
    predicted_incidents = int(round(np.mean(recent)))

    # Risk level based on predicted count relative to overall distribution
    if mean_count == 0:
        risk_level = "low"
    elif predicted_incidents > mean_count + 1.5 * std_count:
        risk_level = "very_high"
    elif predicted_incidents > mean_count + 0.5 * std_count:
        risk_level = "high"
    elif predicted_incidents > mean_count - 0.5 * std_count:
        risk_level = "medium"
    elif predicted_incidents > mean_count - 1.5 * std_count:
        risk_level = "low"
    else:
        risk_level = "very_low"

    return {
        "area_name": req.area_name,
        "period": {"year": year, "month": month},
        "predicted_risk_level": risk_level,
        "predicted_incidents": predicted_incidents,
        "confidence_interval": {
            "lower": max(0, int(round(predicted_incidents - 1.96 * std_count))),
            "upper": int(round(predicted_incidents + 1.96 * std_count)),
            "confidence_level": 0.95,
        },
    }


@app.get("/ml/model-info")
async def model_info():
    """Return metadata about the currently saved model."""
    model, metadata, encoders = _load_model()
    feature_names = metadata.get("feature_names", FEATURE_COLUMNS)
    importances = get_feature_importance(model, feature_names)

    return {
        "model_type": metadata.get("model_type", "unknown"),
        "accuracy": metadata.get("accuracy", 0.0),
        "trained_date": metadata.get("trained_date", ""),
        "feature_importances": importances,
        "classes": metadata.get("classes", []),
    }
