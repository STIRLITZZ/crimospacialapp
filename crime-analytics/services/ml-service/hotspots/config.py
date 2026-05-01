"""Inference configuration for hotspot models copied from the standalone crime app."""

from __future__ import annotations

import os
from pathlib import Path


def _resolve_models_dir() -> Path:
    env_dir = os.getenv("CRIME_MODELS_DIR") or os.getenv("HOTSPOT_MODEL_DIR")
    candidates: list[Path] = []

    if env_dir:
        candidates.append(Path(env_dir))

    current_file = Path(__file__).resolve()
    candidates.extend(parent / "crime" / "models" for parent in current_file.parents)
    candidates.append(Path("/app/crime/models"))

    for candidate in candidates:
        resolved = candidate.resolve()
        if (resolved / "models_metadata.pkl").exists():
            return resolved

    if candidates:
        return candidates[0].resolve()
    return (Path(__file__).resolve().parent / "models").resolve()


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = BASE_DIR / "cache"
MODEL_DIR = _resolve_models_dir()

DATA_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MODELS_METADATA_PATH = MODEL_DIR / "models_metadata.pkl"
ZONE_CLUSTERS_PATH = MODEL_DIR / "zone_clusters.pkl"
PREPROCESSING_ARTIFACTS_PATH = MODEL_DIR / "preprocessing_artifacts.pkl"

LAT_COL = "LAT"
LON_COL = "LON"

MODEL_TYPE = os.getenv("CRIME_MODEL_TYPE", "ensemble")
TOP_N_LOCATIONS = 5
MIN_PROBABILITY_THRESHOLD = float(os.getenv("HOTSPOT_MIN_PROBABILITY", "0.01"))

ENSEMBLE_WEIGHTS = {
    "random_forest": 0.4,
    "xgboost": 0.3,
    "lightgbm": 0.3,
}

USE_GPU = False
LOG_LEVEL = os.getenv("HOTSPOT_LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
