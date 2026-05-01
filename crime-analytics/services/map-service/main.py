import os
from math import ceil
from typing import Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from geo.geojson_generator import (
    generate_area_geojson,
    generate_cluster_data,
    generate_heatmap_data,
)

app = FastAPI(title="Map Service", version="0.1.0")

DATA_SERVICE_URL = os.getenv("DATA_SERVICE_URL", "http://data-service:8001")
ANALYTICS_SERVICE_URL = os.getenv(
    "ANALYTICS_SERVICE_URL", "http://analytics-service:8002"
)


# ── Helpers ─────────────────────────────────────────────


def _build_filter_params(
    area_name: Optional[str] = None,
    crm_cd_desc: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    month: Optional[int] = None,
    hour_from: Optional[int] = None,
    hour_to: Optional[int] = None,
    is_weekend: Optional[bool] = None,
    is_night: Optional[bool] = None,
) -> dict:
    params: dict = {}
    if area_name is not None:
        params["area_name"] = area_name
    if crm_cd_desc is not None:
        params["crm_cd_desc"] = crm_cd_desc
    if year_from is not None:
        params["year_from"] = year_from
    if year_to is not None:
        params["year_to"] = year_to
    if month is not None:
        params["month"] = month
    if hour_from is not None:
        params["hour_from"] = hour_from
    if hour_to is not None:
        params["hour_to"] = hour_to
    if is_weekend is not None:
        params["is_weekend"] = is_weekend
    if is_night is not None:
        params["is_night"] = is_night
    return params


async def _fetch_incidents(params: dict, limit: int = 5000) -> list:
    """Fetch incidents from data-service with pagination and an overall cap."""
    remaining = max(0, limit)
    page = 1
    incidents: list = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        while remaining > 0:
            page_size = min(1000, remaining)
            resp = await client.get(
                f"{DATA_SERVICE_URL}/data/incidents",
                params={**params, "page": page, "per_page": page_size},
            )
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break

            incidents.extend(batch)
            if len(batch) < page_size:
                break

            remaining -= len(batch)
            page += 1

    return incidents


def _sample_incident_points(points: list[dict], sample_target: Optional[int]) -> tuple[list[dict], int]:
    """Reduce a dense incident list to a stable sample for map rendering."""
    if not sample_target or sample_target <= 0 or len(points) <= sample_target:
        return points, 1

    step = max(1, ceil(len(points) / sample_target))

    def stable_rank(point: dict) -> int:
        raw_id = point.get("id") or point.get("dr_no") or 0
        try:
            numeric_id = int(str(raw_id))
        except (TypeError, ValueError):
            numeric_id = 0
        return (numeric_id * 2654435761) % (2 ** 32)

    ordered = sorted(points, key=stable_rank)
    sampled = ordered[::step][:sample_target]
    return sampled, step


# ── Endpoints ───────────────────────────────────────────


@app.get("/map/health")
async def health():
    return {"status": "ok"}


@app.get("/map/geojson/areas")
async def geojson_areas(
    area_name: Optional[str] = Query(default=None),
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    hour_from: Optional[int] = Query(default=None),
    hour_to: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
    is_night: Optional[bool] = Query(default=None),
):
    """GeoJSON FeatureCollection with area polygons coloured by risk."""
    filter_params = _build_filter_params(
        area_name=area_name,
        crm_cd_desc=crm_cd_desc,
        year_from=year_from,
        year_to=year_to,
        month=month,
        hour_from=hour_from,
        hour_to=hour_to,
        is_weekend=is_weekend,
        is_night=is_night,
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Area counts from data-service
        stats_resp = await client.get(
            f"{DATA_SERVICE_URL}/data/stats/by-area", params=filter_params,
        )
        stats_resp.raise_for_status()
        area_stats = stats_resp.json()  # [{area_name, count}, ...]

        # 2. Risk scores from analytics-service
        areas_payload = [
            {
                "area_name": a["area_name"],
                "incidents_count": a["count"],
                "crime_rate": float(a["count"]),
                "density": float(a["count"]),
                "trend_slope": 0.0,
            }
            for a in area_stats
        ]
        risk_resp = await client.post(
            f"{ANALYTICS_SERVICE_URL}/analytics/risk-scores",
            json={"areas": areas_payload},
        )
        risk_resp.raise_for_status()
        scores = risk_resp.json().get("scores", [])

    # Merge counts into scores
    count_map = {a["area_name"]: a["count"] for a in area_stats}
    for s in scores:
        s["incident_count"] = count_map.get(s["area_name"], 0)
        s["crime_rate"] = count_map.get(s["area_name"], 0)

    geojson = generate_area_geojson(scores)
    return JSONResponse(content=geojson)


@app.get("/map/heatmap")
async def heatmap(
    area_name: Optional[str] = Query(default=None),
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    hour_from: Optional[int] = Query(default=None),
    hour_to: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
    is_night: Optional[bool] = Query(default=None),
):
    """Heatmap data compatible with Leaflet.heat."""
    params = _build_filter_params(
        area_name=area_name, crm_cd_desc=crm_cd_desc,
        year_from=year_from, year_to=year_to,
        month=month, hour_from=hour_from, hour_to=hour_to,
        is_weekend=is_weekend, is_night=is_night,
    )
    incidents = await _fetch_incidents(params)
    data = generate_heatmap_data(incidents)
    return data


@app.get("/map/clusters")
async def clusters(
    area_name: Optional[str] = Query(default=None),
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    hour_from: Optional[int] = Query(default=None),
    hour_to: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
    is_night: Optional[bool] = Query(default=None),
):
    """Cluster data for marker clustering on the map."""
    params = _build_filter_params(
        area_name=area_name, crm_cd_desc=crm_cd_desc,
        year_from=year_from, year_to=year_to,
        month=month, hour_from=hour_from, hour_to=hour_to,
        is_weekend=is_weekend, is_night=is_night,
    )
    incidents = await _fetch_incidents(params)
    data = generate_cluster_data(incidents)
    return data


@app.get("/map/incident-points")
async def incident_points(
    lat_min: float = Query(...),
    lat_max: float = Query(...),
    lon_min: float = Query(...),
    lon_max: float = Query(...),
    limit: int = Query(default=5000, ge=1, le=20000),
    sample_target: Optional[int] = Query(default=None, ge=100, le=5000),
    area_name: Optional[str] = Query(default=None),
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    hour_from: Optional[int] = Query(default=None),
    hour_to: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
    is_night: Optional[bool] = Query(default=None),
):
    """Individual incident points within a map viewport bounding box."""
    params = _build_filter_params(
        area_name=area_name, crm_cd_desc=crm_cd_desc,
        year_from=year_from, year_to=year_to,
        month=month, hour_from=hour_from, hour_to=hour_to,
        is_weekend=is_weekend, is_night=is_night,
    )
    incidents = await _fetch_incidents(params, limit=limit)

    # Filter to viewport bounding box
    filtered = [
        p for p in incidents
        if lat_min <= p.get("lat", 0) <= lat_max
        and lon_min <= p.get("lon", 0) <= lon_max
    ]
    total_in_bounds = len(filtered)
    displayed_points, sample_step = _sample_incident_points(filtered, sample_target)

    return {
        "points": displayed_points,
        "count": len(displayed_points),
        "total_in_bounds": total_in_bounds,
        "sampled": sample_step > 1,
        "sample_step": sample_step,
        "sample_ratio": round(1 / sample_step, 4),
        "sampling_label": f"1 in {sample_step}" if sample_step > 1 else "all points",
        "bounds": {
            "ne": [lat_max, lon_max],
            "sw": [lat_min, lon_min],
        },
    }
