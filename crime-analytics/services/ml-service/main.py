import io
import json
import os
from typing import List, Optional, Union

import httpx
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from training.feature_importance import get_feature_importance
from training.train_pipeline import (
    FEATURE_COLUMNS,
    CSV_FEATURE_COLUMNS,
    CSV_TARGET_COLUMN,
    evaluate_models,
    prepare_training_data,
    prepare_csv_training_data,
    save_best_model,
    train_models,
    train_models_balanced,
)

app = FastAPI(title="ML Service", version="0.1.0")

DATA_SERVICE_URL = os.getenv("DATA_SERVICE_URL", "http://data-service:8001")
MODELS_DIR = os.getenv("MODELS_DIR", "/app/models_store")


# ── LAPD Crime Code Descriptions ──────────────────────

CRIME_CODE_MAP = {
    110: "CRIMINAL HOMICIDE",
    113: "MANSLAUGHTER, NEGLIGENT",
    121: "RAPE, FORCIBLE",
    122: "RAPE, ATTEMPTED",
    210: "ROBBERY",
    220: "ATTEMPTED ROBBERY",
    230: "ASSAULT WITH DEADLY WEAPON, AGGRAVATED ASSAULT",
    231: "ASSAULT WITH DEADLY WEAPON ON POLICE OFFICER",
    235: "CHILD ABUSE (PHYSICAL) - AGGRAVATED ASSAULT",
    236: "INTIMATE PARTNER - AGGRAVATED ASSAULT",
    310: "BURGLARY",
    320: "BURGLARY FROM VEHICLE",
    330: "BURGLARY, ATTEMPTED",
    331: "THEFT FROM MOTOR VEHICLE - GRAND ($950.01 & OVER)",
    341: "THEFT-GRAND ($950.01 & OVER)EXCPT,GUNS,FOWL,LIVESTK,PROD",
    343: "SHOPLIFTING-GRAND THEFT ($950.01 & OVER)",
    345: "SHOPLIFTING - PETTY THEFT ($950 & UNDER)",
    350: "THEFT, PERSON",
    351: "PURSE SNATCHING",
    352: "PICKPOCKET",
    354: "THEFT OF IDENTITY",
    420: "THEFT FROM MOTOR VEHICLE - PETTY ($950 & UNDER)",
    421: "THEFT FROM MOTOR VEHICLE - ATTEMPT",
    440: "THEFT PLAIN - PETTY ($950 & UNDER)",
    441: "THEFT PLAIN - ATTEMPT",
    442: "SHOPLIFTING - PETTY THEFT ($950 & UNDER)",
    480: "BIKE - STOLEN",
    510: "VEHICLE - STOLEN",
    520: "VEHICLE - ATTEMPTED STOLEN",
    624: "BATTERY - SIMPLE ASSAULT",
    625: "OTHER ASSAULT",
    626: "INTIMATE PARTNER - SIMPLE ASSAULT",
    627: "CHILD ABUSE (PHYSICAL) - SIMPLE ASSAULT",
    647: "THROWING OBJECT AT MOVING VEHICLE",
    648: "ARSON",
    649: "DOCUMENT FORGERY / STOLEN FELONY",
    651: "DOCUMENT WORTHLESS ($200.01 & OVER)",
    653: "CREDIT CARDS, FRAUD USE ($950.01 & OVER)",
    660: "COUNTERFEIT",
    661: "UNAUTHORIZED COMPUTER ACCESS",
    662: "BUNCO, GRAND THEFT",
    664: "BUNCO, PETTY THEFT",
    668: "EMBEZZLEMENT, GRAND THEFT ($950.01 & OVER)",
    740: "VANDALISM - FELONY ($400 & OVER)",
    745: "VANDALISM - MISDEMEANOR ($399 OR UNDER)",
    753: "DISCHARGE FIREARMS/SHOTS FIRED",
    756: "WEAPONS POSSESSION/BOMBING",
    761: "BRANDISH WEAPON",
    762: "LEWD CONDUCT",
    763: "STALKING",
    810: "SEX, UNLAWFUL",
    812: "CRM AGNST CHLD (13 OR UNDER)",
    815: "SEXUAL PENETRATION W/FOREIGN OBJECT",
    820: "ORAL COPULATION",
    840: "EXTORTION",
    845: "SEX OFFENDER REGISTRANT OUT OF COMPLIANCE",
    850: "INDECENT EXPOSURE",
    860: "BATTERY WITH SEXUAL CONTACT",
    870: "CHILD NEGLECT (SEE 300 W.I.C.)",
    880: "DISRUPT SCHOOL",
    886: "DISTURBING THE PEACE",
    888: "TRESPASSING",
    900: "VIOLATION OF COURT ORDER",
    901: "VIOLATION OF RESTRAINING ORDER",
    902: "VIOLATION OF TEMPORARY RESTRAINING ORDER",
    910: "KIDNAPPING",
    920: "KIDNAPPING - GRAND ATTEMPT",
    921: "HUMAN TRAFFICKING - COMMERCIAL SEX ACTS",
    922: "HUMAN TRAFFICKING - INVOLUNTARY SERVITUDE",
    928: "THREATENING PHONE CALLS/LETTERS",
    930: "CRIMINAL THREATS - NO WEAPON DISPLAYED",
    940: "EXTORTION",
    943: "CRUELTY TO ANIMALS",
    946: "OTHER MISCELLANEOUS CRIME",
    956: "LETTERS, LEWD - TELEPHONE CALLS, LEWD",
}


# ── Request / Response schemas ────────────────────────


class PredictRequest(BaseModel):
    year: int
    month: int
    day: int
    hour: int
    area: int
    vict_age: int = 0
    vict_sex: Union[str, int] = "X"
    lat: float
    lon: float
    is_weekend: bool = False
    is_night: bool = False
    quarter: int = 1
    # Extended CSV features (optional for backward compat)
    rpt_dist_no: int = 0
    vict_descent: int = 0
    premis_cd: int = 0
    weapon_used_cd: int = 0


class PredictAreaRiskRequest(BaseModel):
    area_name: str
    period: dict = Field(default_factory=lambda: {"year": 2024, "month": 1})


class TopProbability(BaseModel):
    crime_type: str
    probability: float


# ── Helpers ───────────────────────────────────────────


def _load_model():
    """Load the saved model, encoders, and metadata from disk."""
    model_path = os.path.join(MODELS_DIR, "best_model.joblib")
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    enc_path = os.path.join(MODELS_DIR, "label_encoders.joblib")

    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=404,
            detail="No trained model found. Upload a CSV and train first via POST /ml/train-csv.",
        )

    model = joblib.load(model_path)
    with open(meta_path) as f:
        metadata = json.load(f)
    encoders = joblib.load(enc_path) if os.path.exists(enc_path) else {}
    return model, metadata, encoders


def _encode_input_legacy(req: PredictRequest, encoders: dict) -> pd.DataFrame:
    """Convert a prediction request into features for DB-trained models."""
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

    if "Vict Sex" in encoders:
        le = encoders["Vict Sex"]
        sex_val = str(req.vict_sex) if str(req.vict_sex) in le.classes_ else "X"
        df["Vict Sex"] = le.transform([sex_val])

    return df[FEATURE_COLUMNS]


def _encode_input_csv(req: PredictRequest) -> pd.DataFrame:
    """Convert a prediction request into features for CSV-trained models."""
    row = {
        "Hour": req.hour,
        "AREA": req.area,
        "Rpt Dist No": req.rpt_dist_no,
        "Vict Age": req.vict_age,
        "Vict Sex": int(req.vict_sex) if isinstance(req.vict_sex, int) else 0,
        "Vict Descent": req.vict_descent,
        "Premis Cd": req.premis_cd,
        "Weapon Used Cd": req.weapon_used_cd,
        "LAT": req.lat,
        "LON": req.lon,
        "Year": req.year,
        "Month": req.month,
        "Day": req.day,
        "IsWeekend": int(req.is_weekend),
        "IsNight": int(req.is_night),
        "Quarter": req.quarter,
    }
    df = pd.DataFrame([row])
    return df[CSV_FEATURE_COLUMNS]


def _resolve_crime_label(prediction, target_column: str) -> str:
    """Convert a model prediction to a human-readable crime type string."""
    if target_column == "Crm Cd":
        code = int(prediction)
        desc = CRIME_CODE_MAP.get(code, "Unknown")
        return f"{code} - {desc}"
    return str(prediction)


# ── Endpoints ─────────────────────────────────────────


@app.get("/ml/health")
async def health():
    return {"status": "ok"}


@app.post("/ml/train")
async def train():
    """Fetch data from data-service, train models, evaluate, and save best."""
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

    X_train, X_test, y_train, y_test, label_encoders = prepare_training_data(df)
    models = train_models(X_train, y_train)
    evaluation = evaluate_models(models, X_test, y_test)
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


@app.post("/ml/train-csv")
async def train_csv(file: UploadFile = File(...)):
    """Upload a CSV file and train a balanced crime prediction model.

    Expected CSV columns:
        Hour, AREA, Rpt Dist No, Crm Cd, Vict Age, Vict Sex,
        Vict Descent, Premis Cd, Weapon Used Cd, LAT, LON,
        Year, Month, Day

    The model predicts Crm Cd (crime type code) using all other columns
    as features.  Training uses class_weight='balanced' so that each
    crime type is represented equally during training.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    if len(df) < 20:
        raise HTTPException(
            status_code=400,
            detail=f"CSV has only {len(df)} rows. Need at least 20 for training.",
        )

    # Prepare data (validates columns, computes derived features, filters rare classes)
    try:
        X_train, X_test, y_train, y_test, encoders = prepare_csv_training_data(df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Train with balanced class weights
    models = train_models_balanced(X_train, y_train)

    # Evaluate
    evaluation = evaluate_models(models, X_test, y_test)

    # Save best model with CSV feature metadata
    best_name = save_best_model(
        models, evaluation, encoders, MODELS_DIR,
        feature_columns=CSV_FEATURE_COLUMNS,
        target_column=CSV_TARGET_COLUMN,
    )

    # Build per-class accuracy summary
    best_report = evaluation[best_name].get("classification_report", {})
    per_class_summary = {}
    for key, val in best_report.items():
        if isinstance(val, dict) and "precision" in val:
            code = int(key) if str(key).isdigit() else key
            label = CRIME_CODE_MAP.get(code, str(code)) if isinstance(code, int) else str(code)
            per_class_summary[label] = {
                "precision": round(val["precision"], 4),
                "recall": round(val["recall"], 4),
                "f1_score": round(val["f1-score"], 4),
                "support": val["support"],
            }

    return {
        "status": "success",
        "best_model": best_name,
        "accuracy": evaluation[best_name]["accuracy"],
        "rows_total": len(df),
        "rows_used": len(X_train) + len(X_test),
        "crime_types_count": int(y_train.nunique()),
        "crime_types": sorted(y_train.unique().tolist()),
        "models_comparison": {
            name: {"accuracy": info["accuracy"]}
            for name, info in evaluation.items()
        },
        "per_class_metrics": per_class_summary,
    }


@app.post("/ml/predict")
async def predict(req: PredictRequest):
    """Predict crime type for a single incident."""
    model, metadata, encoders = _load_model()

    feature_names = metadata.get("feature_names", FEATURE_COLUMNS)
    target_col = metadata.get("target_column", "Crm Cd Desc")

    # Choose encoding based on model type
    if "Rpt Dist No" in feature_names:
        X = _encode_input_csv(req)
    else:
        X = _encode_input_legacy(req, encoders)

    prediction = model.predict(X)[0]

    # Probabilities
    top_probs: List[dict] = []
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        classes = model.classes_
        sorted_idx = np.argsort(proba)[::-1]
        confidence = float(proba[sorted_idx[0]])
        top_probs = [
            {
                "crime_type": _resolve_crime_label(classes[i], target_col),
                "probability": round(float(proba[i]), 4),
            }
            for i in sorted_idx[:5]
        ]
    elif hasattr(model, "decision_function"):
        df_vals = model.decision_function(X)[0]
        classes = model.classes_
        sorted_idx = np.argsort(df_vals)[::-1]
        exp_vals = np.exp(df_vals - df_vals.max())
        softmax = exp_vals / exp_vals.sum()
        confidence = float(softmax[sorted_idx[0]])
        top_probs = [
            {
                "crime_type": _resolve_crime_label(classes[i], target_col),
                "probability": round(float(softmax[i]), 4),
            }
            for i in sorted_idx[:5]
        ]

    # Feature contributions
    contributions = get_feature_importance(model, feature_names)

    return {
        "predicted_crime_type": _resolve_crime_label(prediction, target_col),
        "confidence": round(confidence, 4),
        "top_probabilities": top_probs,
        "feature_contributions": contributions,
    }


@app.post("/ml/predict-area-risk")
async def predict_area_risk(req: PredictAreaRiskRequest):
    """Predict risk level for an area in a given period."""
    year = req.period.get("year", 2024)
    month = req.period.get("month", 1)

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

    monthly_counts = [entry["count"] for entry in matrix]
    if not monthly_counts:
        raise HTTPException(status_code=400, detail="Insufficient data for prediction")

    mean_count = float(np.mean(monthly_counts))
    std_count = float(np.std(monthly_counts)) if len(monthly_counts) > 1 else 0.0

    recent = monthly_counts[-12:] if len(monthly_counts) >= 12 else monthly_counts
    predicted_incidents = int(round(np.mean(recent)))

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

    # Resolve class labels
    classes_raw = metadata.get("classes", [])
    target_col = metadata.get("target_column", "Crm Cd Desc")
    classes_display = [
        _resolve_crime_label(c, target_col) for c in classes_raw
    ]

    return {
        "model_type": metadata.get("model_type", "unknown"),
        "accuracy": metadata.get("accuracy", 0.0),
        "trained_date": metadata.get("trained_date", ""),
        "feature_importances": importances,
        "classes": classes_display,
        "target_column": target_col,
        "per_class_metrics": metadata.get("per_class_metrics", {}),
    }
