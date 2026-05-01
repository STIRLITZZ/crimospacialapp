"""Inference helpers for hotspot models copied from the standalone crime app."""

from __future__ import annotations

import logging
import pickle
from typing import Dict

import numpy as np
import pandas as pd

from . import config

logger = logging.getLogger(__name__)


class CrimeHotspotModel:
    """Thin runtime wrapper around a saved per-crime hotspot model."""

    def __init__(self, use_gpu: bool | None = None, crime_code: int | None = None):
        self.use_gpu = use_gpu if use_gpu is not None else config.USE_GPU
        self.crime_code = crime_code
        self.model = None
        self.feature_names: list[str] = []
        self.feature_importance = None
        self.metrics: Dict = {}
        self.n_zones = None
        self.using_gpu = False

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        if self.model is None:
            raise ValueError("Model not loaded yet")
        return self.model.predict(features)

    def predict_proba(self, features: pd.DataFrame) -> np.ndarray:
        if self.model is None:
            raise ValueError("Model not loaded yet")
        return self.model.predict_proba(features)

    def get_top_features(self, n: int = 10):
        if self.feature_importance is None:
            self._extract_feature_importance()
        if self.feature_importance is None:
            return None
        return self.feature_importance.head(n)

    def _extract_feature_importance(self):
        if self.model is None or not self.feature_names:
            return

        try:
            importance = getattr(self.model, "feature_importances_", None)
            if importance is None:
                return

            self.feature_importance = pd.DataFrame(
                {
                    "feature": self.feature_names,
                    "importance": importance,
                }
            ).sort_values("importance", ascending=False)
        except Exception as exc:
            logger.warning(
                "Could not extract hotspot feature importance for crime %s: %s",
                self.crime_code,
                exc,
            )
            self.feature_importance = None

    @classmethod
    def load(cls, filepath: str, use_gpu: bool | None = None):
        with open(filepath, "rb") as handle:
            model_data = pickle.load(handle)

        instance = cls(use_gpu=use_gpu, crime_code=model_data.get("crime_code"))
        instance.model = model_data["model"]
        instance.feature_names = list(model_data.get("feature_names", []))
        instance.feature_importance = model_data.get("feature_importance")
        instance.metrics = model_data.get("metrics", {})
        instance.n_zones = model_data.get("n_zones")
        instance.using_gpu = bool(model_data.get("using_gpu", False))
        if instance.feature_importance is None:
            instance._extract_feature_importance()

        logger.info(
            "Loaded hotspot model for crime code %s from %s",
            instance.crime_code,
            filepath,
        )
        return instance


class EnsembleModel:
    """Runtime wrapper for the saved ensemble hotspot models."""

    def __init__(self, crime_code: int | None = None):
        self.crime_code = crime_code
        self.rf_model = None
        self.xgb_model = None
        self.lgbm_model = None
        self.feature_names: list[str] = []
        self.feature_importance = None
        self.metrics: Dict = {}
        self.n_zones = None
        self.weights = config.ENSEMBLE_WEIGHTS.copy()

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        predictions = []

        if self.rf_model is not None:
            predictions.append(self.rf_model.predict(features))
        if self.xgb_model is not None:
            predictions.append(self.xgb_model.predict(features))
        if self.lgbm_model is not None:
            predictions.append(self.lgbm_model.predict(features))

        if not predictions:
            raise ValueError("No models available for prediction")

        stacked = np.array(predictions)
        return np.apply_along_axis(
            lambda row: np.bincount(row.astype(int)).argmax(),
            axis=0,
            arr=stacked,
        )

    def predict_proba(self, features: pd.DataFrame) -> np.ndarray:
        probabilities = []
        weights = []

        if self.rf_model is not None:
            probabilities.append(self.rf_model.predict_proba(features))
            weights.append(self.weights["random_forest"])
        if self.xgb_model is not None:
            probabilities.append(self.xgb_model.predict_proba(features))
            weights.append(self.weights["xgboost"])
        if self.lgbm_model is not None:
            probabilities.append(self.lgbm_model.predict_proba(features))
            weights.append(self.weights["lightgbm"])

        if not probabilities:
            raise ValueError("No models available for prediction")

        normalized = np.array(weights, dtype=float)
        normalized /= normalized.sum()
        return sum(weight * proba for weight, proba in zip(normalized, probabilities))

    def get_top_features(self, n: int = 10):
        if self.feature_importance is None:
            self._calculate_feature_importance()
        if self.feature_importance is None:
            return None
        return self.feature_importance.head(n)

    def _calculate_feature_importance(self):
        if not self.feature_names:
            return

        try:
            importances = []
            weights = []

            if self.rf_model is not None and hasattr(self.rf_model, "feature_importances_"):
                importances.append(self.rf_model.feature_importances_)
                weights.append(self.weights["random_forest"])
            if self.xgb_model is not None and hasattr(self.xgb_model, "feature_importances_"):
                importances.append(self.xgb_model.feature_importances_)
                weights.append(self.weights["xgboost"])
            if self.lgbm_model is not None and hasattr(self.lgbm_model, "feature_importances_"):
                importances.append(self.lgbm_model.feature_importances_)
                weights.append(self.weights["lightgbm"])

            if not importances:
                return

            normalized = np.array(weights, dtype=float)
            normalized /= normalized.sum()
            averaged = sum(weight * values for weight, values in zip(normalized, importances))

            self.feature_importance = pd.DataFrame(
                {
                    "feature": self.feature_names,
                    "importance": averaged,
                }
            ).sort_values("importance", ascending=False)
        except Exception as exc:
            logger.warning(
                "Could not calculate ensemble feature importance for crime %s: %s",
                self.crime_code,
                exc,
            )
            self.feature_importance = None

    @classmethod
    def load(cls, filepath: str):
        with open(filepath, "rb") as handle:
            model_data = pickle.load(handle)

        instance = cls(crime_code=model_data.get("crime_code"))
        instance.rf_model = model_data.get("rf_model")
        instance.xgb_model = model_data.get("xgb_model")
        instance.lgbm_model = model_data.get("lgbm_model")
        instance.feature_names = list(model_data.get("feature_names", []))
        instance.feature_importance = model_data.get("feature_importance")
        instance.metrics = model_data.get("metrics", {})
        instance.n_zones = model_data.get("n_zones")
        instance.weights = model_data.get(
            "weights",
            config.ENSEMBLE_WEIGHTS.copy(),
        )
        if instance.feature_importance is None:
            instance._calculate_feature_importance()

        logger.info(
            "Loaded hotspot ensemble for crime code %s from %s",
            instance.crime_code,
            filepath,
        )
        return instance
