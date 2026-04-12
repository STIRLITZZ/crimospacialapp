import os

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/data")

DATA_SERVICE_URL = os.getenv("DATA_SERVICE_URL", "http://data-service:8001")


async def _proxy_get(path: str, request: Request) -> JSONResponse:
    """Forward a GET request to data-service, passing all query params."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{DATA_SERVICE_URL}{path}",
            params=dict(request.query_params),
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/incidents")
async def list_incidents(request: Request):
    return await _proxy_get("/data/incidents", request)


@router.get("/incidents/{dr_no}")
async def get_incident(dr_no: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{DATA_SERVICE_URL}/data/incidents/{dr_no}")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/areas")
async def list_areas(request: Request):
    return await _proxy_get("/data/areas", request)


@router.get("/crime-types")
async def list_crime_types(request: Request):
    return await _proxy_get("/data/crime-types", request)


@router.get("/date-range")
async def date_range(request: Request):
    return await _proxy_get("/data/date-range", request)


@router.get("/stats/{path:path}")
async def stats_proxy(path: str, request: Request):
    return await _proxy_get(f"/data/stats/{path}", request)
