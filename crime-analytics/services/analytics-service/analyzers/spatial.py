from typing import List

import numpy as np
from scipy.stats import gaussian_kde

from analyzers.risk_score import (
    _min_max_norm,
    _risk_level,
    _trend_component,
    compute_risk_score,
    W1,
    W2,
    W3,
)


def compute_area_risk_scores(all_areas_data: List[dict]) -> List[dict]:
    """Compute risk scores for all areas simultaneously.

    Each item in *all_areas_data* must have:
        area_name, crime_rate, density, trend_slope

    Normalisation is done across the full set so scores are comparable.
    Risk levels are assigned using percentile thresholds on the final scores.
    """
    if not all_areas_data:
        return []

    rates = [a["crime_rate"] for a in all_areas_data]
    densities = [a["density"] for a in all_areas_data]

    min_rate, max_rate = min(rates), max(rates)
    min_dens, max_dens = min(densities), max(densities)

    # Build normalised records and compute raw scores
    scored: List[dict] = []
    for area in all_areas_data:
        normalised = {
            "area_name": area["area_name"],
            "rate_norm": _min_max_norm(area["crime_rate"], min_rate, max_rate),
            "density_norm": _min_max_norm(area["density"], min_dens, max_dens),
            "trend_slope": area.get("trend_slope", 0.0),
        }
        scored.append(compute_risk_score(normalised))

    # Assign risk levels using percentile thresholds across all scores
    all_scores = [s["risk_score"] for s in scored]
    thresholds = {
        "p20": float(np.percentile(all_scores, 20)),
        "p40": float(np.percentile(all_scores, 40)),
        "p60": float(np.percentile(all_scores, 60)),
        "p80": float(np.percentile(all_scores, 80)),
    }
    for item in scored:
        item["risk_level"] = _risk_level(item["risk_score"], thresholds)

    return scored


def compute_hotspots(
    incidents: List[dict],
    grid_size: int = 50,
) -> List[dict]:
    """Kernel Density Estimation on incident lat/lon coordinates.

    Returns a grid of points with intensity values suitable for heatmap
    rendering on a map.
    """
    if len(incidents) < 2:
        return []

    lats = np.array([p["lat"] for p in incidents])
    lons = np.array([p["lon"] for p in incidents])

    coords = np.vstack([lons, lats])
    kde = gaussian_kde(coords)

    # Build evaluation grid covering the bounding box
    lon_min, lon_max = float(lons.min()), float(lons.max())
    lat_min, lat_max = float(lats.min()), float(lats.max())

    lon_grid = np.linspace(lon_min, lon_max, grid_size)
    lat_grid = np.linspace(lat_min, lat_max, grid_size)
    lon_mesh, lat_mesh = np.meshgrid(lon_grid, lat_grid)

    grid_coords = np.vstack([lon_mesh.ravel(), lat_mesh.ravel()])
    density = kde(grid_coords)

    # Normalise intensity to 0-1
    d_min, d_max = density.min(), density.max()
    if d_max > d_min:
        intensity = (density - d_min) / (d_max - d_min)
    else:
        intensity = np.zeros_like(density)

    hotspots = [
        {
            "lat": round(float(lat_mesh.ravel()[i]), 6),
            "lon": round(float(lon_mesh.ravel()[i]), 6),
            "intensity": round(float(intensity[i]), 4),
        }
        for i in range(len(intensity))
        if intensity[i] > 0.05  # filter out near-zero noise
    ]

    return hotspots
