import os

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/ml")

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8003")


@router.post("/train")
async def train(request: Request):
    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(f"{ML_SERVICE_URL}/ml/train")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.post("/predict")
async def predict(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{ML_SERVICE_URL}/ml/predict", json=body)
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.post("/predict-area-risk")
async def predict_area_risk(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{ML_SERVICE_URL}/ml/predict-area-risk", json=body
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/model-info")
async def model_info():
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{ML_SERVICE_URL}/ml/model-info")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)
