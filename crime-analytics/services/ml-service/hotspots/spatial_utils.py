"""Spatial helpers for hotspot inference copied from the standalone crime app."""

from __future__ import annotations

import logging
import pickle
from typing import Dict, List

from . import config

logger = logging.getLogger(__name__)


class SpatialProcessor:
    """Loads and exposes the saved spatial clustering metadata."""

    def __init__(self):
        self.zone_model = None
        self.zone_centers = None
        self.city_center = None
        self.city_bounds = None

    def get_zone_info(self, zone_id: int) -> Dict:
        if self.zone_centers is None:
            raise ValueError("Zones not loaded yet.")

        if zone_id >= len(self.zone_centers):
            raise ValueError(
                f"Invalid zone_id {zone_id}. Valid range: 0-{len(self.zone_centers) - 1}"
            )

        center_coords = self.zone_centers[zone_id]
        return {
            "zone_id": zone_id,
            "center_lat": center_coords[0],
            "center_lon": center_coords[1],
            "center_coords": tuple(center_coords),
        }

    def get_all_zones_info(self) -> List[Dict]:
        if self.zone_centers is None:
            raise ValueError("Zones not loaded yet.")
        return [self.get_zone_info(index) for index in range(len(self.zone_centers))]

    def load_spatial_model(self, filepath: str | None = None):
        target = filepath or str(config.ZONE_CLUSTERS_PATH)
        with open(target, "rb") as handle:
            spatial_data = pickle.load(handle)

        self.zone_model = spatial_data["zone_model"]
        self.zone_centers = spatial_data["zone_centers"]
        self.city_center = spatial_data["city_center"]
        self.city_bounds = spatial_data["city_bounds"]

        logger.info(
            "Loaded hotspot spatial model from %s with %s zones",
            target,
            len(self.zone_centers),
        )
