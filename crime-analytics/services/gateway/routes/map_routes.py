import os

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/map")

MAP_SERVICE_URL = os.getenv("MAP_SERVICE_URL", "http://map-service:8004")


async def _proxy_get(path: str, request: Request) -> JSONResponse:
    """Forward a GET request to map-service, passing all query params."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{MAP_SERVICE_URL}{path}",
            params=dict(request.query_params),
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/geojson/areas")
async def geojson_areas(request: Request):
    return await _proxy_get("/map/geojson/areas", request)


@router.get("/heatmap")
async def heatmap(request: Request):
    return await _proxy_get("/map/heatmap", request)


@router.get("/clusters")
async def clusters(request: Request):
    return await _proxy_get("/map/clusters", request)


@router.get("/incident-points")
async def incident_points(request: Request):
    return await _proxy_get("/map/incident-points", request)
