"""Generators for GeoJSON, heatmap, and cluster data structures."""

from collections import defaultdict
from typing import Dict, List

import numpy as np
from scipy.stats import gaussian_kde

from geo.boundaries import build_boundaries_from_incidents, get_la_area_boundaries

RISK_COLORS: Dict[str, str] = {
    "very_low": "#2ecc71",
    "low": "#27ae60",
    "medium": "#f39c12",
    "high": "#e67e22",
    "very_high": "#e74c3c",
}


def generate_area_geojson(
    areas_with_scores: List[dict],
    incidents: List[dict] | None = None,
) -> dict:
    """Build a GeoJSON FeatureCollection for LAPD areas.

    Each Feature carries properties: area_name, risk_score, risk_level,
    incident_count, crime_rate, and a hex colour.

    *incidents* is an optional flat list used to derive convex-hull
    polygons when the pre-defined bounding boxes are not precise enough.
    """
    # Try pre-defined boundaries first, fall back to incident hulls
    boundaries = get_la_area_boundaries()
    if incidents:
        hull_boundaries = build_boundaries_from_incidents(incidents)
        # Merge: prefer hulls when available, keep predefined otherwise
        for name, ring in hull_boundaries.items():
            boundaries[name] = ring

    features: list = []
    for area in areas_with_scores:
        name = area.get("area_name", "")
        ring = boundaries.get(name)
        if not ring:
            continue

        risk_level = area.get("risk_level", "medium")
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
            "properties": {
                "area_name": name,
                "risk_score": area.get("risk_score", 0),
                "risk_level": risk_level,
                "incident_count": area.get("incident_count", 0),
                "crime_rate": area.get("crime_rate", 0),
                "color": RISK_COLORS.get(risk_level, "#f39c12"),
            },
        }
        features.append(feature)

    return {"type": "FeatureCollection", "features": features}


def generate_heatmap_data(
    incidents: List[dict],
    filters: dict | None = None,
) -> dict:
    """Produce a Leaflet.heat–compatible payload from incident coordinates.

    Returns ``{points, max_intensity, bounds}``.
    """
    if len(incidents) < 2:
        return {"points": [], "max_intensity": 0, "bounds": None}

    lats = np.array([p["lat"] for p in incidents], dtype=float)
    lons = np.array([p["lon"] for p in incidents], dtype=float)

    coords = np.vstack([lons, lats])
    kde = gaussian_kde(coords)
    density = kde(coords)

    d_min, d_max = float(density.min()), float(density.max())
    if d_max > d_min:
        intensity = (density - d_min) / (d_max - d_min)
    else:
        intensity = np.ones_like(density)

    points = [
        [round(float(lats[i]), 6), round(float(lons[i]), 6), round(float(intensity[i]), 4)]
        for i in range(len(lats))
    ]

    return {
        "points": points,
        "max_intensity": round(float(intensity.max()), 4),
        "bounds": {
            "ne": [round(float(lats.max()), 6), round(float(lons.max()), 6)],
            "sw": [round(float(lats.min()), 6), round(float(lons.min()), 6)],
        },
    }


def generate_cluster_data(incidents: List[dict]) -> dict:
    """Group incidents into spatial clusters for marker clustering.

    Uses a simple grid-based approach: divide the bounding box into a
    grid, assign each point to a cell, then emit one cluster per
    non-empty cell with centre, count, radius, and crime-type breakdown.
    """
    if not incidents:
        return {"clusters": []}

    lats = np.array([p["lat"] for p in incidents], dtype=float)
    lons = np.array([p["lon"] for p in incidents], dtype=float)

    # ~20×20 grid cells
    GRID = 20
    lat_bins = np.linspace(lats.min(), lats.max(), GRID + 1)
    lon_bins = np.linspace(lons.min(), lons.max(), GRID + 1)

    lat_idx = np.digitize(lats, lat_bins) - 1
    lon_idx = np.digitize(lons, lon_bins) - 1
    lat_idx = np.clip(lat_idx, 0, GRID - 1)
    lon_idx = np.clip(lon_idx, 0, GRID - 1)

    cells: Dict[tuple, list] = defaultdict(list)
    for i in range(len(incidents)):
        cells[(int(lat_idx[i]), int(lon_idx[i]))].append(i)

    clusters: list = []
    for (li, lo), indices in cells.items():
        if not indices:
            continue
        c_lats = lats[indices]
        c_lons = lons[indices]

        crime_types: Dict[str, int] = defaultdict(int)
        for idx in indices:
            ct = incidents[idx].get("crm_cd_desc", "UNKNOWN")
            crime_types[ct] += 1

        clusters.append({
            "center": [
                round(float(c_lats.mean()), 6),
                round(float(c_lons.mean()), 6),
            ],
            "count": len(indices),
            "radius": round(float(max(c_lats.ptp(), c_lons.ptp()) / 2), 6),
            "crime_types": dict(crime_types),
        })

    clusters.sort(key=lambda c: c["count"], reverse=True)
    return {"clusters": clusters}
