import os
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
    crm_cd_desc: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    month: Optional[int] = None,
    hour_from: Optional[int] = None,
    hour_to: Optional[int] = None,
    is_weekend: Optional[bool] = None,
) -> dict:
    params: dict = {}
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
    return params


async def _fetch_incidents(params: dict, limit: int = 5000) -> list:
    """Fetch incidents from data-service with given filter params."""
    params["page"] = 1
    params["per_page"] = limit
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{DATA_SERVICE_URL}/data/incidents", params=params)
        resp.raise_for_status()
        return resp.json()


# ── Endpoints ───────────────────────────────────────────


@app.get("/map/health")
async def health():
    return {"status": "ok"}


@app.get("/map/geojson/areas")
async def geojson_areas(
    crm_cd_desc: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
):
    """GeoJSON FeatureCollection with area polygons coloured by risk."""
    filter_params = _build_filter_params(
        crm_cd_desc=crm_cd_desc, year_from=year, year_to=year, month=month,
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
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    hour_from: Optional[int] = Query(default=None),
    hour_to: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
):
    """Heatmap data compatible with Leaflet.heat."""
    params = _build_filter_params(
        crm_cd_desc=crm_cd_desc, year_from=year_from, year_to=year_to,
        month=month, hour_from=hour_from, hour_to=hour_to,
        is_weekend=is_weekend,
    )
    incidents = await _fetch_incidents(params)
    data = generate_heatmap_data(incidents)
    return data


@app.get("/map/clusters")
async def clusters(
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    hour_from: Optional[int] = Query(default=None),
    hour_to: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
):
    """Cluster data for marker clustering on the map."""
    params = _build_filter_params(
        crm_cd_desc=crm_cd_desc, year_from=year_from, year_to=year_to,
        month=month, hour_from=hour_from, hour_to=hour_to,
        is_weekend=is_weekend,
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
    limit: int = Query(default=5000, ge=1, le=10000),
    crm_cd_desc: Optional[str] = Query(default=None),
    year_from: Optional[int] = Query(default=None),
    year_to: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    is_weekend: Optional[bool] = Query(default=None),
):
    """Individual incident points within a map viewport bounding box."""
    params = _build_filter_params(
        crm_cd_desc=crm_cd_desc, year_from=year_from, year_to=year_to,
        month=month, is_weekend=is_weekend,
    )
    incidents = await _fetch_incidents(params, limit=limit)

    # Filter to viewport bounding box
    filtered = [
        p for p in incidents
        if lat_min <= p.get("lat", 0) <= lat_max
        and lon_min <= p.get("lon", 0) <= lon_max
    ]

    return {
        "points": filtered,
        "count": len(filtered),
        "bounds": {
            "ne": [lat_max, lon_max],
            "sw": [lat_min, lon_min],
        },
    }
