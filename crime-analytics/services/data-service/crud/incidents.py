from typing import List, Optional

from sqlalchemy import func, insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from crud.filters import apply_filters
from models.crime_incident import CrimeIncident
from schemas.crime import CrimeFilter, PaginationParams


async def get_incidents(
    db: AsyncSession,
    filters: CrimeFilter,
    pagination: PaginationParams,
) -> List[CrimeIncident]:
    """Query incidents with dynamic filters and pagination."""
    stmt = select(CrimeIncident).order_by(CrimeIncident.date_occ.desc())
    stmt = apply_filters(stmt, filters)
    offset = (pagination.page - 1) * pagination.per_page
    stmt = stmt.offset(offset).limit(pagination.per_page)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_incident_by_dr_no(
    db: AsyncSession, dr_no: str
) -> Optional[CrimeIncident]:
    """Fetch a single incident by its DR number."""
    stmt = select(CrimeIncident).where(CrimeIncident.dr_no == dr_no)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def bulk_insert_incidents(
    db: AsyncSession, incidents: List[dict]
) -> int:
    """Insert incidents in batches of 5000, then populate geom from lat/lon."""
    BATCH_SIZE = 5000
    total = 0
    for i in range(0, len(incidents), BATCH_SIZE):
        batch = incidents[i : i + BATCH_SIZE]
        await db.execute(insert(CrimeIncident), batch)
        total += len(batch)

    # Populate PostGIS geometry column from lat/lon
    await db.execute(
        text(
            "UPDATE crime_incidents "
            "SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326) "
            "WHERE geom IS NULL AND lat IS NOT NULL AND lon IS NOT NULL"
        )
    )
    await db.commit()
    return total


async def get_distinct_areas(db: AsyncSession) -> List[str]:
    """Return all unique area names, sorted alphabetically."""
    stmt = (
        select(CrimeIncident.area_name)
        .distinct()
        .order_by(CrimeIncident.area_name)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_distinct_crime_types(db: AsyncSession) -> List[str]:
    """Return all unique crime type descriptions, sorted alphabetically."""
    stmt = (
        select(CrimeIncident.crm_cd_desc)
        .distinct()
        .order_by(CrimeIncident.crm_cd_desc)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_date_range(db: AsyncSession) -> dict:
    """Return the min and max date_occ in the dataset."""
    stmt = select(
        func.min(CrimeIncident.date_occ).label("min_date"),
        func.max(CrimeIncident.date_occ).label("max_date"),
    )
    result = await db.execute(stmt)
    row = result.one()
    return {"min_date": row.min_date, "max_date": row.max_date}
