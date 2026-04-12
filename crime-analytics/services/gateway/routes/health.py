import os

import httpx
from fastapi import APIRouter

router = APIRouter()

SERVICE_URLS = {
    "data_service": os.getenv("DATA_SERVICE_URL", "http://data-service:8001"),
    "analytics_service": os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8002"),
    "ml_service": os.getenv("ML_SERVICE_URL", "http://ml-service:8003"),
    "map_service": os.getenv("MAP_SERVICE_URL", "http://map-service:8004"),
    "etl_service": os.getenv("ETL_SERVICE_URL", "http://etl-service:8005"),
}

HEALTH_PATHS = {
    "data_service": "/health",
    "analytics_service": "/analytics/health",
    "ml_service": "/ml/health",
    "map_service": "/map/health",
    "etl_service": "/etl/status",
}


@router.get("/api/health")
async def health_check():
    """Check status of all downstream services."""
    result = {"gateway": "ok"}

    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, base_url in SERVICE_URLS.items():
            path = HEALTH_PATHS.get(name, "/health")
            try:
                resp = await client.get(f"{base_url}{path}")
                result[name] = "ok" if resp.status_code == 200 else "degraded"
            except Exception:
                result[name] = "down"

    return result
