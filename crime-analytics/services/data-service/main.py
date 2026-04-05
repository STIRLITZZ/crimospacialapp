from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from crud import incidents, aggregations
from database import get_db, init_db
from schemas.crime import (
    CrimeFilter,
    CrimeIncidentResponse,
    PaginationParams,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Data Service", version="0.1.0", lifespan=lifespan)


# ── Health ──────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/data/health")
async def data_health():
    return {"status": "ok"}


# ── Incident CRUD ──────────────────────────────────────


@app.get("/data/incidents", response_model=List[CrimeIncidentResponse])
async def list_incidents(
    filters: CrimeFilter = Depends(),
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
):
    return await incidents.get_incidents(db, filters, pagination)


@app.get("/data/incidents/{dr_no}", response_model=CrimeIncidentResponse)
async def get_incident(
    dr_no: str,
    db: AsyncSession = Depends(get_db),
):
    incident = await incidents.get_incident_by_dr_no(db, dr_no)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/data/incidents/bulk")
async def bulk_import(
    records: List[dict],
    db: AsyncSession = Depends(get_db),
):
    count = await incidents.bulk_insert_incidents(db, records)
    return {"inserted": count}


@app.get("/data/areas")
async def list_areas(db: AsyncSession = Depends(get_db)):
    return await incidents.get_distinct_areas(db)


@app.get("/data/crime-types")
async def list_crime_types(db: AsyncSession = Depends(get_db)):
    return await incidents.get_distinct_crime_types(db)


@app.get("/data/date-range")
async def date_range(db: AsyncSession = Depends(get_db)):
    return await incidents.get_date_range(db)


# ── Aggregation Endpoints ──────────────────────────────


@app.get("/data/stats/by-area")
async def stats_by_area(
    filters: CrimeFilter = Depends(),
    db: AsyncSession = Depends(get_db),
):
    return await aggregations.get_incidents_by_area(db, filters)


@app.get("/data/stats/by-time")
async def stats_by_time(
    filters: CrimeFilter = Depends(),
    group_by: str = Query(default="month", pattern="^(month|hour|weekday)$"),
    db: AsyncSession = Depends(get_db),
):
    return await aggregations.get_incidents_by_time(db, filters, group_by)


@app.get("/data/stats/by-crime-type")
async def stats_by_crime_type(
    filters: CrimeFilter = Depends(),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await aggregations.get_incidents_by_crime_type(db, filters, limit)


@app.get("/data/stats/hourly")
async def stats_hourly(
    filters: CrimeFilter = Depends(),
    db: AsyncSession = Depends(get_db),
):
    return await aggregations.get_hourly_distribution(db, filters)


@app.get("/data/stats/area-time-matrix")
async def area_time_matrix(
    area_name: Optional[str] = Query(default=None),
    crm_cd_desc: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    return await aggregations.get_area_time_matrix(db, area_name, crm_cd_desc)
