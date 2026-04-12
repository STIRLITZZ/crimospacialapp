import os

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/analytics")

DATA_SERVICE_URL = os.getenv("DATA_SERVICE_URL", "http://data-service:8001")
ANALYTICS_SERVICE_URL = os.getenv(
    "ANALYTICS_SERVICE_URL", "http://analytics-service:8002"
)


@router.get("/dashboard")
async def dashboard(request: Request):
    """Orchestrated endpoint: combine stats + risk scores into one payload."""
    params = dict(request.query_params)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Fetch aggregated stats from data-service (parallel)
        area_task = client.get(
            f"{DATA_SERVICE_URL}/data/stats/by-area", params=params
        )
        time_task = client.get(
            f"{DATA_SERVICE_URL}/data/stats/by-time", params=params
        )
        crime_task = client.get(
            f"{DATA_SERVICE_URL}/data/stats/by-crime-type", params=params
        )
        date_range_task = client.get(f"{DATA_SERVICE_URL}/data/date-range")

        area_resp, time_resp, crime_resp, dr_resp = await asyncio_gather(
            area_task, time_task, crime_task, date_range_task
        )

        areas_stats = area_resp.json() if area_resp.status_code == 200 else []
        time_series = time_resp.json() if time_resp.status_code == 200 else []
        crime_types = crime_resp.json() if crime_resp.status_code == 200 else []
        date_range = dr_resp.json() if dr_resp.status_code == 200 else {}

        # 2. Compute risk scores via analytics-service
        areas_payload = [
            {
                "area_name": a["area_name"],
                "incidents_count": a["count"],
                "crime_rate": float(a["count"]),
                "density": float(a["count"]),
                "trend_slope": 0.0,
            }
            for a in areas_stats
        ]
        risk_resp = await client.post(
            f"{ANALYTICS_SERVICE_URL}/analytics/risk-scores",
            json={"areas": areas_payload},
        )
        risk_scores = (
            risk_resp.json().get("scores", [])
            if risk_resp.status_code == 200
            else []
        )

    # 3. Build summary
    total_incidents = sum(a["count"] for a in areas_stats) if areas_stats else 0
    highest_risk = (
        max(risk_scores, key=lambda r: r["risk_score"])["area_name"]
        if risk_scores
        else "N/A"
    )
    most_common = crime_types[0]["crm_cd_desc"] if crime_types else "N/A"
    dr_min = date_range.get("min_date", "")
    dr_max = date_range.get("max_date", "")

    return {
        "areas_stats": areas_stats,
        "time_series": time_series,
        "crime_type_distribution": crime_types,
        "risk_scores": risk_scores,
        "summary": {
            "total_incidents": total_incidents,
            "date_range": f"{dr_min} — {dr_max}" if dr_min else "",
            "highest_risk_area": highest_risk,
            "most_common_crime": most_common,
        },
    }


@router.post("/risk-scores")
async def risk_scores(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{ANALYTICS_SERVICE_URL}/analytics/risk-scores", json=body
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.post("/hotspots")
async def hotspots(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{ANALYTICS_SERVICE_URL}/analytics/hotspots", json=body
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


# ── helpers ─────────────────────────────────────────────

import asyncio  # noqa: E402


async def asyncio_gather(*coros):
    """Await multiple awaitables concurrently."""
    return await asyncio.gather(*coros)
