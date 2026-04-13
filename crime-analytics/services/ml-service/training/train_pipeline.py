import json
import os
from datetime import date, datetime, timezone
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ── Original feature set (DB-based training) ──────────

FEATURE_COLUMNS = [
    "Year", "Month", "Day", "Hour", "AREA",
    "Vict Age", "Vict Sex", "LAT", "LON",
    "IsWeekend", "IsNight", "Quarter",
]

TARGET_COLUMN = "Crm Cd Desc"

# ── CSV feature set (CSV-based training) ──────────────

CSV_FEATURE_COLUMNS_RAW = [
    "Hour", "AREA", "Rpt Dist No", "Vict Age", "Vict Sex",
    "Vict Descent", "Premis Cd", "Weapon Used Cd",
    "LAT", "LON", "Year", "Month", "Day",
]

CSV_FEATURE_COLUMNS = [
    "Hour", "AREA", "Rpt Dist No", "Vict Age", "Vict Sex",
    "Vict Descent", "Premis Cd", "Weapon Used Cd",
    "LAT", "LON", "Year", "Month", "Day",
    "IsWeekend", "IsNight", "Quarter",
]

CSV_TARGET_COLUMN = "Crm Cd"

MIN_CLASS_INSTANCES = 50
CSV_MIN_CLASS_INSTANCES = 5


# ── DB-based training (original) ──────────────────────


def prepare_training_data(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, dict]:
    """Select features, encode categoricals, filter rare classes, and split."""
    work = df[FEATURE_COLUMNS + [TARGET_COLUMN]].copy()

    label_encoders: dict = {}
    le_sex = LabelEncoder()
    work["Vict Sex"] = work["Vict Sex"].fillna("X")
    work["Vict Sex"] = le_sex.fit_transform(work["Vict Sex"].astype(str))
    label_encoders["Vict Sex"] = le_sex

    work["IsWeekend"] = work["IsWeekend"].astype(int)
    work["IsNight"] = work["IsNight"].astype(int)

    work = work.dropna(subset=FEATURE_COLUMNS)

    counts = work[TARGET_COLUMN].value_counts()
    valid_classes = counts[counts >= MIN_CLASS_INSTANCES].index
    work = work[work[TARGET_COLUMN].isin(valid_classes)]

    X = work[FEATURE_COLUMNS]
    y = work[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    return X_train, X_test, y_train, y_test, label_encoders


# ── CSV-based training (new) ──────────────────────────


def prepare_csv_training_data(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, dict]:
    """Prepare training data from CSV with extended features.

    All features are expected to be numeric.  Computes derived features
    (IsWeekend, IsNight, Quarter) from date/time columns.
    """
    work = df.copy()

    # Validate required columns
    missing_features = [c for c in CSV_FEATURE_COLUMNS_RAW if c not in work.columns]
    if missing_features:
        raise ValueError(f"Missing feature columns: {missing_features}")
    if CSV_TARGET_COLUMN not in work.columns:
        raise ValueError(f"Missing target column: {CSV_TARGET_COLUMN}")

    # Convert to numeric
    for col in CSV_FEATURE_COLUMNS_RAW + [CSV_TARGET_COLUMN]:
        work[col] = pd.to_numeric(work[col], errors="coerce")

    # Compute derived features
    work["Quarter"] = ((work["Month"].astype(int) - 1) // 3) + 1

    def _is_weekend(row):
        try:
            d = date(int(row["Year"]), int(row["Month"]), int(row["Day"]))
            return int(d.weekday() >= 5)
        except (ValueError, TypeError):
            return 0

    work["IsWeekend"] = work.apply(_is_weekend, axis=1)
    work["IsNight"] = (
        (work["Hour"].astype(int) >= 20) | (work["Hour"].astype(int) < 6)
    ).astype(int)

    # Drop NaN rows
    work = work.dropna(subset=CSV_FEATURE_COLUMNS + [CSV_TARGET_COLUMN])

    # Filter rare target classes so each crime type has enough samples
    counts = work[CSV_TARGET_COLUMN].value_counts()
    valid_classes = counts[counts >= CSV_MIN_CLASS_INSTANCES].index
    work = work[work[CSV_TARGET_COLUMN].isin(valid_classes)]

    if len(work) < 20:
        raise ValueError(
            f"Not enough data after filtering rare classes: {len(work)} rows. "
            f"Need at least {CSV_MIN_CLASS_INSTANCES} samples per crime type."
        )

    X = work[CSV_FEATURE_COLUMNS].astype(float)
    y = work[CSV_TARGET_COLUMN].astype(int)

    # Remove classes with < 2 samples (can't stratify)
    class_counts = y.value_counts()
    single_classes = class_counts[class_counts < 2].index
    if len(single_classes) > 0:
        mask = ~y.isin(single_classes)
        X = X[mask]
        y = y[mask]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    return X_train, X_test, y_train, y_test, {}


# ── Model training ────────────────────────────────────


def train_models(X_train: pd.DataFrame, y_train: pd.Series) -> dict:
    """Train RandomForest classifier."""
    rf = RandomForestClassifier(
        n_estimators=200, max_depth=15, n_jobs=-1, random_state=42
    )
    rf.fit(X_train, y_train)
    return {"random_forest": rf}


def train_models_balanced(X_train: pd.DataFrame, y_train: pd.Series) -> dict:
    """Train RandomForest with class_weight='balanced'.

    Each crime type is weighted equally during training,
    preventing rare crime types from being ignored.
    """
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    rf.fit(X_train, y_train)
    return {"random_forest": rf}


# ── Evaluation ────────────────────────────────────────


def evaluate_models(
    models: dict, X_test: pd.DataFrame, y_test: pd.Series
) -> dict:
    """Evaluate each model and return structured comparison."""
    feature_names = (
        X_test.columns.tolist()
        if hasattr(X_test, "columns")
        else [f"f{i}" for i in range(X_test.shape[1])]
    )

    results: dict = {}
    for name, model in models.items():
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)

        report = classification_report(
            y_test, y_pred, output_dict=True, zero_division=0
        )

        importances = None
        if hasattr(model, "feature_importances_"):
            importances = dict(
                zip(feature_names, model.feature_importances_.tolist())
            )

        results[name] = {
            "accuracy": round(float(acc), 4),
            "classification_report": report,
            "feature_importances": importances,
        }

    return results


# ── Save ──────────────────────────────────────────────


def save_best_model(
    models: dict,
    evaluation: dict,
    label_encoders: dict,
    save_dir: str,
    feature_columns: list = None,
    target_column: str = None,
) -> str:
    """Persist the highest-accuracy model, encoders, and metadata."""
    os.makedirs(save_dir, exist_ok=True)

    if feature_columns is None:
        feature_columns = FEATURE_COLUMNS
    if target_column is None:
        target_column = TARGET_COLUMN

    best_name = max(evaluation, key=lambda k: evaluation[k]["accuracy"])
    best_model = models[best_name]
    best_acc = evaluation[best_name]["accuracy"]

    joblib.dump(best_model, os.path.join(save_dir, "best_model.joblib"))
    joblib.dump(label_encoders, os.path.join(save_dir, "label_encoders.joblib"))

    # Extract per-class metrics from best model's report
    best_report = evaluation[best_name].get("classification_report", {})
    per_class = {}
    for key, val in best_report.items():
        if isinstance(val, dict) and "precision" in val:
            per_class[str(key)] = {
                "precision": round(val["precision"], 4),
                "recall": round(val["recall"], 4),
                "f1-score": round(val["f1-score"], 4),
                "support": val["support"],
            }

    metadata = {
        "model_type": best_name,
        "accuracy": best_acc,
        "trained_date": datetime.now(timezone.utc).isoformat(),
        "feature_names": feature_columns,
        "target_column": target_column,
        "classes": (
            best_model.classes_.tolist()
            if hasattr(best_model, "classes_")
            else []
        ),
        "per_class_metrics": per_class,
    }
    with open(os.path.join(save_dir, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    return best_name
