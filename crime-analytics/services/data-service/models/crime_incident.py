from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Index
from geoalchemy2 import Geometry

from database import Base


class CrimeIncident(Base):
    __tablename__ = "crime_incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dr_no = Column(String, unique=True, index=True, nullable=False)
    date_occ = Column(DateTime, index=True)

    # Time decomposition
    year = Column(Integer, index=True)
    month = Column(Integer)
    day = Column(Integer)
    hour = Column(Integer)
    quarter = Column(Integer)
    weekday = Column(Integer)
    is_weekend = Column(Boolean)
    is_night = Column(Boolean)

    # Location
    area = Column(Integer, index=True)
    area_name = Column(String(50), index=True)

    # Crime classification
    crm_cd = Column(Integer, index=True)
    crm_cd_desc = Column(String(100))

    # Victim
    vict_age = Column(Integer, nullable=True)
    vict_sex = Column(String(1), nullable=True)

    # Coordinates and spatial data
    lat = Column(Float)
    lon = Column(Float)
    lat_bin = Column(Integer)
    lon_bin = Column(Integer)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    __table_args__ = (
        Index("ix_area_year_month", "area", "year", "month"),
        Index("ix_crm_cd_year", "crm_cd", "year"),
    )
