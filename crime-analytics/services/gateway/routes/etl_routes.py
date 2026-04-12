import os

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/etl")

ETL_SERVICE_URL = os.getenv("ETL_SERVICE_URL", "http://etl-service:8005")


@router.post("/run-pipeline")
async def run_pipeline():
    async with httpx.AsyncClient(timeout=600.0) as client:
        resp = await client.post(f"{ETL_SERVICE_URL}/etl/run-pipeline")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/status")
async def etl_status():
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{ETL_SERVICE_URL}/etl/status")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)
