import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from routes.health import router as health_router
from routes.data_routes import router as data_router
from routes.analytics_routes import router as analytics_router
from routes.ml_routes import router as ml_router
from routes.map_routes import router as map_router
from routes.etl_routes import router as etl_router

# ── Logging ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("gateway")

# ── Rate limiter ────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# ── App ─────────────────────────────────────────────────

app = FastAPI(title="Crime Analytics Gateway", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Logging middleware ──────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=502,
            content={"detail": "Upstream service unavailable"},
        )
    duration_ms = round((time.time() - start) * 1000, 1)
    logger.info(
        "%s %s -> %s (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ── Error handler for upstream failures ─────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unexpected error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal gateway error"},
    )


# ── Routers ─────────────────────────────────────────────

app.include_router(health_router)
app.include_router(data_router)
app.include_router(analytics_router)
app.include_router(ml_router)
app.include_router(map_router)
app.include_router(etl_router)
