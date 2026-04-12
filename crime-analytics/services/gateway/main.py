import os

import httpx
from fastapi import FastAPI, HTTPException, Request, Response

app = FastAPI(title="Gateway Service", version="0.1.0")

SERVICE_URLS = {
    "data": os.getenv("DATA_SERVICE_URL", "http://data-service:8001"),
    "analytics": os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service:8002"),
    "ml": os.getenv("ML_SERVICE_URL", "http://ml-service:8003"),
    "map": os.getenv("MAP_SERVICE_URL", "http://map-service:8004"),
    "etl": os.getenv("ETL_SERVICE_URL", "http://etl-service:8005"),
}


def _build_target_url(service_key: str, path: str, query: str) -> str:
    base_url = SERVICE_URLS[service_key].rstrip("/")
    suffix = f"/{path}" if path else ""
    url = f"{base_url}/{service_key}{suffix}"
    return f"{url}?{query}" if query else url


async def _proxy_request(service_key: str, path: str, request: Request) -> Response:
    target_url = _build_target_url(service_key, path, request.url.query)
    body = await request.body()
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length"}
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            upstream = await client.request(
                method=request.method,
                url=target_url,
                content=body,
                headers=headers,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in {"content-encoding", "transfer-encoding", "connection"}
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "services": list(SERVICE_URLS.keys()),
    }


@app.api_route("/{service_key}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
@app.api_route(
    "/{service_key}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy(service_key: str, path: str = "", request: Request = None):
    if service_key not in SERVICE_URLS:
        raise HTTPException(status_code=404, detail=f"Unknown service '{service_key}'")
    return await _proxy_request(service_key, path, request)
