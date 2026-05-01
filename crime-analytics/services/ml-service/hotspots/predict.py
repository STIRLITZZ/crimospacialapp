"""Hotspot predictor copied and adapted from the standalone crime app."""

from __future__ import annotations

import logging
import os
import pickle
from datetime import date
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

from . import config
from .model_utils import CrimeHotspotModel, EnsembleModel
from .spatial_utils import SpatialProcessor

logging.basicConfig(level=config.LOG_LEVEL, format=config.LOG_FORMAT)
logger = logging.getLogger(__name__)


def _lookup(mapping: Dict, key: int, default=None):
    if key in mapping:
        return mapping[key]
    key_str = str(key)
    if key_str in mapping:
        return mapping[key_str]
    return default


def _season_from_month(month: int) -> int:
    if month <= 3:
        return 0
    if month <= 6:
        return 1
    if month <= 9:
        return 2
    return 3


def _is_holiday(month: int, day: int) -> int:
    if month == 1 and day == 1:
        return 1
    if month == 7 and day == 4:
        return 1
    if month == 11 and 22 <= day <= 28:
        return 1
    if month == 12 and 24 <= day <= 26:
        return 1
    return 0


class HotspotPredictor:
    """Loads saved hotspot models and serves scenario-based inference."""

    def __init__(self):
        self.models = {}
        self.spatial_processor = None
        self.preprocessing_artifacts = None
        self.models_metadata = None
        self.available_crime_codes: List[int] = []

    def load_models(self):
        logger.info("Loading hotspot models and artifacts from %s", config.MODEL_DIR)

        self.spatial_processor = SpatialProcessor()
        self.spatial_processor.load_spatial_model()

        if os.path.exists(config.PREPROCESSING_ARTIFACTS_PATH):
            with open(config.PREPROCESSING_ARTIFACTS_PATH, "rb") as handle:
                self.preprocessing_artifacts = pickle.load(handle)
        else:
            self.preprocessing_artifacts = {}

        with open(config.MODELS_METADATA_PATH, "rb") as handle:
            self.models_metadata = pickle.load(handle)

        raw_codes = self.models_metadata.get("crime_codes", [])
        self.available_crime_codes = sorted(int(code) for code in raw_codes)

        logger.info("Found %s hotspot crime models", len(self.available_crime_codes))

    def _load_model_for_crime(self, crime_code: int):
        if crime_code in self.models:
            return self.models[crime_code]

        if crime_code not in self.available_crime_codes:
            raise ValueError(f"No trained hotspot model for crime code {crime_code}")

        model_files = self.models_metadata.get("model_files", {})
        model_filename = _lookup(model_files, crime_code)
        if not model_filename:
            raise ValueError(f"Missing model file for crime code {crime_code}")

        model_path = os.path.join(config.MODEL_DIR, model_filename)
        model_type = getattr(config, "MODEL_TYPE", "random_forest")

        try:
            if model_type == "ensemble":
                try:
                    model = EnsembleModel.load(model_path)
                except Exception:
                    model = CrimeHotspotModel.load(model_path)
            else:
                model = CrimeHotspotModel.load(model_path)
        except Exception as exc:
            logger.error("Failed to load hotspot model for crime %s: %s", crime_code, exc)
            raise

        self.models[crime_code] = model
        return model

    def predict_hotspots(
        self,
        crime_code: int,
        features: Dict | None = None,
        top_n: int | None = None,
    ) -> List[Dict]:
        if top_n is None:
            top_n = config.TOP_N_LOCATIONS

        model = self._load_model_for_crime(crime_code)

        if features is None:
            feature_frame = self._create_default_features(model.feature_names)
        else:
            feature_frame = self._create_features_from_dict(features, model.feature_names)

        probabilities = model.predict_proba(feature_frame)[0]
        top_zone_indices = np.argsort(probabilities)[::-1][:top_n]

        results = []
        for index in top_zone_indices:
            probability = probabilities[index]
            if probability < config.MIN_PROBABILITY_THRESHOLD:
                continue

            zone_info = self.spatial_processor.get_zone_info(int(index))
            results.append(
                {
                    "zone_id": int(index),
                    "probability": float(probability),
                    "probability_pct": float(probability * 100),
                    "latitude": float(zone_info["center_lat"]),
                    "longitude": float(zone_info["center_lon"]),
                    "rank": len(results) + 1,
                }
            )

        logger.info("Predicted %s hotspots for crime %s", len(results), crime_code)
        return results

    def predict_for_scenario(
        self,
        crime_code: int,
        prediction_date: date | None = None,
        hour: int | None = None,
        month: int | None = None,
        day_of_week: int | None = None,
        area: int | None = None,
        top_n: int | None = None,
    ) -> List[Dict]:
        features = {}

        if hour is not None:
            features["Hour"] = hour
            if 0 <= hour <= 5:
                features["time_of_day"] = 0
            elif 6 <= hour <= 11:
                features["time_of_day"] = 1
            elif 12 <= hour <= 17:
                features["time_of_day"] = 2
            else:
                features["time_of_day"] = 3

        if prediction_date is not None:
            features["Year"] = prediction_date.year
            features["Month"] = prediction_date.month
            features["Day"] = prediction_date.day
            features["day_of_week"] = prediction_date.weekday()
            features["is_weekend"] = 1 if prediction_date.weekday() >= 5 else 0
            features["season"] = _season_from_month(prediction_date.month)
            features["is_holiday"] = _is_holiday(
                prediction_date.month,
                prediction_date.day,
            )
        else:
            if month is not None:
                features["Month"] = month
                features["season"] = _season_from_month(month)

            if day_of_week is not None:
                features["day_of_week"] = day_of_week
                features["is_weekend"] = 1 if day_of_week >= 5 else 0

        if area is not None:
            features["AREA"] = area

        return self.predict_hotspots(crime_code, features, top_n)

    def _create_default_features(self, feature_names: List[str]) -> pd.DataFrame:
        default_values = {
            "Hour": 12,
            "AREA": 1,
            "Rpt Dist No": 100,
            "Vict Age": 30,
            "Vict Sex": 1,
            "Vict Descent": 1,
            "Premis Cd": 101,
            "Weapon Used Cd": 400,
            "Status": 1,
            "Year": 2020,
            "Month": 6,
            "Day": 15,
            "day_of_week": 2,
            "is_weekend": 0,
            "time_of_day": 2,
            "is_holiday": 0,
            "season": 1,
        }

        return pd.DataFrame(
            [{name: default_values.get(name, 0) for name in feature_names}]
        )

    def _create_features_from_dict(
        self,
        features: Dict,
        feature_names: List[str],
    ) -> pd.DataFrame:
        frame = self._create_default_features(feature_names)

        for key, value in features.items():
            if key in frame.columns:
                frame[key] = value

        return frame

    def get_available_crimes(self) -> List[int]:
        return self.available_crime_codes

    def get_model_info(self, crime_code: int) -> Dict:
        if crime_code not in self.available_crime_codes:
            raise ValueError(f"No model for crime code {crime_code}")

        metrics_summary = self.models_metadata.get("metrics_summary", {})
        metrics = _lookup(metrics_summary, crime_code, {})
        model = self._load_model_for_crime(crime_code)

        return {
            "crime_code": crime_code,
            "metrics": metrics,
            "feature_importance": model.get_top_features(10),
            "n_zones": model.n_zones,
        }

    def get_city_center(self) -> Tuple[float, float]:
        if self.spatial_processor is None:
            raise ValueError("Models not loaded. Call load_models() first.")
        return self.spatial_processor.city_center

    def get_all_zones(self) -> List[Dict]:
        if self.spatial_processor is None:
            raise ValueError("Models not loaded. Call load_models() first.")
        return self.spatial_processor.get_all_zones_info()
