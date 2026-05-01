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


@router.post("/train-csv")
async def train_csv(request: Request):
    """Proxy CSV file upload to the ML service for training."""
    form = await request.form()
    file = form.get("file")
    if not file:
        return JSONResponse(
            content={"detail": "No file provided"}, status_code=400
        )

    contents = await file.read()

    async with httpx.AsyncClient(timeout=600.0) as client:
        files = {"file": (file.filename, contents, file.content_type or "text/csv")}
        resp = await client.post(f"{ML_SERVICE_URL}/ml/train-csv", files=files)
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


@router.get("/hotspot-models")
async def hotspot_models():
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{ML_SERVICE_URL}/ml/hotspot-models")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.post("/predict-hotspots")
async def predict_hotspots(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{ML_SERVICE_URL}/ml/predict-hotspots", json=body
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/hotspot-model-info/{crime_code}")
async def hotspot_model_info(crime_code: int):
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{ML_SERVICE_URL}/ml/hotspot-model-info/{crime_code}"
        )
        return JSONResponse(content=resp.json(), status_code=resp.status_code)


@router.get("/model-info")
async def model_info():
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{ML_SERVICE_URL}/ml/model-info")
        return JSONResponse(content=resp.json(), status_code=resp.status_code)
