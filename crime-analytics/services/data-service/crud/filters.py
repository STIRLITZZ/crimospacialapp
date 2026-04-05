from sqlalchemy import Select

from models.crime_incident import CrimeIncident
from schemas.crime import CrimeFilter


def apply_filters(stmt: Select, filters: CrimeFilter) -> Select:
    """Append WHERE clauses to a SQLAlchemy Select based on non-None filter fields."""
    if filters.area_name is not None:
        stmt = stmt.where(CrimeIncident.area_name == filters.area_name)
    if filters.crm_cd_desc is not None:
        stmt = stmt.where(CrimeIncident.crm_cd_desc == filters.crm_cd_desc)
    if filters.year_from is not None:
        stmt = stmt.where(CrimeIncident.year >= filters.year_from)
    if filters.year_to is not None:
        stmt = stmt.where(CrimeIncident.year <= filters.year_to)
    if filters.month is not None:
        stmt = stmt.where(CrimeIncident.month == filters.month)
    if filters.hour_from is not None:
        stmt = stmt.where(CrimeIncident.hour >= filters.hour_from)
    if filters.hour_to is not None:
        stmt = stmt.where(CrimeIncident.hour <= filters.hour_to)
    if filters.is_weekend is not None:
        stmt = stmt.where(CrimeIncident.is_weekend == filters.is_weekend)
    return stmt
