from sqlalchemy import Column, Integer, String, Float, Index

from database import Base


class AreaStats(Base):
    __tablename__ = "area_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    area_name = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    crm_cd_desc = Column(String(100), nullable=False)
    incident_count = Column(Integer, default=0)
    crime_rate = Column(Float, nullable=True)
    density = Column(Float, nullable=True)
    trend_slope = Column(Float, nullable=True)

    __table_args__ = (
        Index(
            "ix_area_stats_composite",
            "area_name", "year", "month", "crm_cd_desc",
        ),
    )
