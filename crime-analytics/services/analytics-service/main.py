import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from analyzers.descriptive import (
    compute_crime_rate,
    compute_density,
    compute_seasonality,
    compute_trend,
)
from analyzers.spatial import compute_area_risk_scores, compute_hotspots

app = FastAPI(title="Analytics Service", version="0.1.0")

DATA_SERVICE_URL = os.getenv("DATA_SERVICE_URL", "http://data-service:8001")


# ── Request / Response schemas ──────────────────────────


class TimeSeriesPoint(BaseModel):
    period: str = ""
    count: int


class DescriptiveRequest(BaseModel):
    area_name: str
    incidents_count: int
    population: int
    area_sq_km: float
    time_series: List[TimeSeriesPoint] = []
    monthly_counts: List[int] = Field(default_factory=list)


class AreaRiskInput(BaseModel):
    area_name: str
    incidents_count: int = 0
    crime_rate: float = 0.0
    density: float = 0.0
    trend_slope: float = 0.0
    population: int = 0
    area_sq_km: float = 0.0


class RiskScoresRequest(BaseModel):
    areas: List[AreaRiskInput]


class IncidentPoint(BaseModel):
    lat: float
    lon: float


class HotspotsRequest(BaseModel):
    incidents: List[IncidentPoint]
    grid_size: int = Field(default=50, ge=10, le=200)


# ── Endpoints ───────────────────────────────────────────


@app.get("/analytics/health")
async def health():
    return {"status": "ok"}



@app.post("/analytics/risk-scores")
async def risk_scores(req: RiskScoresRequest):
    """Compute risk scores for all areas simultaneously."""
    if not req.areas:
        return {"scores": []}

    areas_data = []
    for a in req.areas:
        crime_rate = a.crime_rate
        density = a.density

        # If rate/density not pre-computed, derive from count + population/area
        if crime_rate == 0.0 and a.population > 0:
            crime_rate = compute_crime_rate(a.incidents_count, a.population)
        if density == 0.0 and a.area_sq_km > 0:
            density = compute_density(a.incidents_count, a.area_sq_km)

        areas_data.append({
            "area_name": a.area_name,
            "crime_rate": crime_rate,
            "density": density,
            "trend_slope": a.trend_slope,
        })

    scores = compute_area_risk_scores(areas_data)
    return {"scores": scores}


@app.post("/analytics/hotspots")
async def hotspots(req: HotspotsRequest):
    """Generate KDE-based heatmap data from incident coordinates."""
    if len(req.incidents) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 incident points are required for KDE",
        )

    points = [p.model_dump() for p in req.incidents]
    result = compute_hotspots(points, grid_size=req.grid_size)
    return {"hotspots": result, "point_count": len(result)}
