import json
import os
from datetime import datetime, timezone
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import LinearSVC

FEATURE_COLUMNS = [
    "Year", "Month", "Day", "Hour", "AREA",
    "Vict Age", "Vict Sex", "LAT", "LON",
    "IsWeekend", "IsNight", "Quarter",
]

TARGET_COLUMN = "Crm Cd Desc"

MIN_CLASS_INSTANCES = 50


def prepare_training_data(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, dict]:
    """Select features, encode categoricals, filter rare classes, and split.

    Returns (X_train, X_test, y_train, y_test, label_encoders).
    """
    work = df[FEATURE_COLUMNS + [TARGET_COLUMN]].copy()

    # Encode Vict Sex (categorical -> integer)
    label_encoders: dict = {}
    le_sex = LabelEncoder()
    work["Vict Sex"] = work["Vict Sex"].fillna("X")
    work["Vict Sex"] = le_sex.fit_transform(work["Vict Sex"].astype(str))
    label_encoders["Vict Sex"] = le_sex

    # Convert booleans to int for sklearn
    work["IsWeekend"] = work["IsWeekend"].astype(int)
    work["IsNight"] = work["IsNight"].astype(int)

    # Drop rows with NaN in features
    work = work.dropna(subset=FEATURE_COLUMNS)

    # Filter rare target classes (< MIN_CLASS_INSTANCES)
    counts = work[TARGET_COLUMN].value_counts()
    valid_classes = counts[counts >= MIN_CLASS_INSTANCES].index
    work = work[work[TARGET_COLUMN].isin(valid_classes)]

    X = work[FEATURE_COLUMNS]
    y = work[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    return X_train, X_test, y_train, y_test, label_encoders


def train_models(X_train: pd.DataFrame, y_train: pd.Series) -> dict:
    """Train three classifiers and return them in a dict."""
    models = {}

    svc = LinearSVC(max_iter=2000, random_state=42)
    svc.fit(X_train, y_train)
    models["linear_svc"] = svc

    gb = GradientBoostingClassifier(
        n_estimators=100, max_depth=5, random_state=42
    )
    gb.fit(X_train, y_train)
    models["gradient_boosting"] = gb

    rf = RandomForestClassifier(
        n_estimators=200, max_depth=15, n_jobs=-1, random_state=42
    )
    rf.fit(X_train, y_train)
    models["random_forest"] = rf

    return models


def evaluate_models(
    models: dict, X_test: pd.DataFrame, y_test: pd.Series
) -> dict:
    """Evaluate each model and return structured comparison."""
    results: dict = {}
    for name, model in models.items():
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)

        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        importances = None
        if hasattr(model, "feature_importances_"):
            importances = dict(
                zip(FEATURE_COLUMNS, model.feature_importances_.tolist())
            )

        results[name] = {
            "accuracy": round(float(acc), 4),
            "classification_report": report,
            "feature_importances": importances,
        }

    return results


def save_best_model(
    models: dict,
    evaluation: dict,
    label_encoders: dict,
    save_dir: str,
) -> str:
    """Persist the highest-accuracy model, encoders, and metadata."""
    os.makedirs(save_dir, exist_ok=True)

    best_name = max(evaluation, key=lambda k: evaluation[k]["accuracy"])
    best_model = models[best_name]
    best_acc = evaluation[best_name]["accuracy"]

    joblib.dump(best_model, os.path.join(save_dir, "best_model.joblib"))
    joblib.dump(label_encoders, os.path.join(save_dir, "label_encoders.joblib"))

    metadata = {
        "model_type": best_name,
        "accuracy": best_acc,
        "trained_date": datetime.now(timezone.utc).isoformat(),
        "feature_names": FEATURE_COLUMNS,
        "classes": (
            best_model.classes_.tolist()
            if hasattr(best_model, "classes_")
            else []
        ),
    }
    with open(os.path.join(save_dir, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    return best_name
