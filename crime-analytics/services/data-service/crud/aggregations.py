from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.filters import apply_filters
from models.crime_incident import CrimeIncident
from schemas.crime import CrimeFilter


async def get_incidents_by_area(
    db: AsyncSession, filters: CrimeFilter
) -> List[dict]:
    """Count incidents per area, ordered by count descending."""
    stmt = (
        select(
            CrimeIncident.area_name.label("area_name"),
            func.count().label("count"),
        )
        .group_by(CrimeIncident.area_name)
        .order_by(func.count().desc())
    )
    stmt = apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return [dict(row) for row in result.mappings().all()]


async def get_incidents_by_time(
    db: AsyncSession,
    filters: CrimeFilter,
    group_by: str = "month",
) -> List[dict]:
    """Count incidents grouped by year and a second time dimension."""
    group_col_map = {
        "month": CrimeIncident.month,
        "hour": CrimeIncident.hour,
        "weekday": CrimeIncident.weekday,
    }
    if group_by not in group_col_map:
        group_by = "month"
    second_col = group_col_map[group_by]

    stmt = (
        select(
            CrimeIncident.year.label("year"),
            second_col.label(group_by),
            func.count().label("count"),
        )
        .group_by(CrimeIncident.year, second_col)
        .order_by(CrimeIncident.year, second_col)
    )
    stmt = apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return [dict(row) for row in result.mappings().all()]


async def get_incidents_by_crime_type(
    db: AsyncSession,
    filters: CrimeFilter,
    limit: int = 20,
) -> List[dict]:
    """Top N crime types by incident count."""
    stmt = (
        select(
            CrimeIncident.crm_cd_desc.label("crm_cd_desc"),
            func.count().label("count"),
        )
        .group_by(CrimeIncident.crm_cd_desc)
        .order_by(func.count().desc())
        .limit(limit)
    )
    stmt = apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return [dict(row) for row in result.mappings().all()]


async def get_area_time_matrix(
    db: AsyncSession,
    area_name: Optional[str] = None,
    crm_cd_desc: Optional[str] = None,
) -> List[dict]:
    """Year × month incident count matrix, optionally scoped to area/crime type."""
    stmt = (
        select(
            CrimeIncident.year.label("year"),
            CrimeIncident.month.label("month"),
            func.count().label("count"),
        )
        .group_by(CrimeIncident.year, CrimeIncident.month)
        .order_by(CrimeIncident.year, CrimeIncident.month)
    )
    if area_name is not None:
        stmt = stmt.where(CrimeIncident.area_name == area_name)
    if crm_cd_desc is not None:
        stmt = stmt.where(CrimeIncident.crm_cd_desc == crm_cd_desc)
    result = await db.execute(stmt)
    return [dict(row) for row in result.mappings().all()]


async def get_hourly_distribution(
    db: AsyncSession, filters: CrimeFilter
) -> List[dict]:
    """Incident count distribution across 24 hours."""
    stmt = (
        select(
            CrimeIncident.hour.label("hour"),
            func.count().label("count"),
        )
        .group_by(CrimeIncident.hour)
        .order_by(CrimeIncident.hour)
    )
    stmt = apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return [dict(row) for row in result.mappings().all()]
