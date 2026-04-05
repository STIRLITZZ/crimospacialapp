import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://crime_user:crime_pass@db:5432/crime_db"
)
ASYNC_DATABASE_URL = DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://", 1
)

engine = create_async_engine(
    ASYNC_DATABASE_URL, echo=False, pool_size=20, max_overflow=10
)
SessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with SessionLocal() as session:
        yield session


async def init_db():
    """Enable PostGIS extension and create all tables."""
    # Import models so they register with Base.metadata
    from models.crime_incident import CrimeIncident  # noqa: F401
    from models.aggregated_stats import AreaStats  # noqa: F401

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)
