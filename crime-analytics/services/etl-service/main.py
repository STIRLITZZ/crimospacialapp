import asyncio
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from threading import Lock

from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, inspect, text

from pipelines.cleaner import clean_raw_data, read_raw_data
from pipelines.feature_engineer import add_features

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crime_user:crime_pass@db:5432/crime_db")
DATA_DIR = os.getenv("DATA_DIR", "/app/data/raw")
TARGET_TABLE = "crime_incidents"
AUTO_IMPORT_ENABLED = os.getenv("AUTO_IMPORT_ENABLED", "true").lower() == "true"
AUTO_IMPORT_WAIT_SECONDS = int(os.getenv("AUTO_IMPORT_WAIT_SECONDS", "60"))
SUPPORTED_FILENAMES = [
    "Crime_Data_from_2020_to_Present.xlsx",
    "Crime_Data_from_2020_to_Present.csv",
]
INSERT_COLUMNS = [
    "dr_no",
    "date_occ",
    "year",
    "month",
    "day",
    "hour",
    "quarter",
    "weekday",
    "is_weekend",
    "is_night",
    "area",
    "area_name",
    "crm_cd",
    "crm_cd_desc",
    "vict_age",
    "vict_sex",
    "lat",
    "lon",
    "lat_bin",
    "lon_bin",
]
INSERT_SQL = text(
    "INSERT INTO crime_incidents ("
    + ", ".join(INSERT_COLUMNS)
    + ") VALUES ("
    + ", ".join(f":{column}" for column in INSERT_COLUMNS)
    + ")"
)

pipeline_lock = Lock()
startup_task = None


def _initial_status() -> dict:
    return {
        "last_run_at": None,
        "status": "idle",
        "rows_processed": 0,
        "rows_cleaned": 0,
        "duration_seconds": 0,
        "error": None,
        "source_file": None,
        "auto_import_enabled": AUTO_IMPORT_ENABLED,
        "auto_import_triggered": False,
    }


pipeline_status: dict = _initial_status()


def _relative_source_name(input_path: str | None) -> str | None:
    if not input_path:
        return None
    return f"data/raw/{os.path.basename(input_path)}"


def _set_status(**updates) -> None:
    pipeline_status.update(updates)


def _mark_terminal_status(
    *,
    status: str,
    start_time: float,
    input_path: str | None,
    auto_triggered: bool,
    rows_processed: int = 0,
    rows_cleaned: int = 0,
    error: str | None = None,
) -> dict:
    payload = {
        "last_run_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "rows_processed": rows_processed,
        "rows_cleaned": rows_cleaned,
        "duration_seconds": round(time.time() - start_time, 2),
        "error": error,
        "source_file": _relative_source_name(input_path),
        "auto_import_enabled": AUTO_IMPORT_ENABLED,
        "auto_import_triggered": auto_triggered,
    }
    _set_status(**payload)
    return payload


def _resolve_input_path() -> str:
    """Return the first supported raw dataset file found in DATA_DIR."""
    for filename in SUPPORTED_FILENAMES:
        input_path = os.path.join(DATA_DIR, filename)
        if os.path.exists(input_path):
            return input_path

    supported = ", ".join(SUPPORTED_FILENAMES)
    raise FileNotFoundError(f"No supported input file found in {DATA_DIR}. Expected one of: {supported}")


def _create_engine():
    return create_engine(DATABASE_URL, pool_pre_ping=True)


def _table_exists(engine) -> bool:
    return inspect(engine).has_table(TARGET_TABLE)


def _count_incidents(engine) -> int:
    with engine.connect() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {TARGET_TABLE}")).scalar_one())


def _wait_for_destination_table(timeout_seconds: int = AUTO_IMPORT_WAIT_SECONDS) -> None:
    deadline = time.time() + timeout_seconds
    last_error = None

    while time.time() < deadline:
        engine = _create_engine()
        try:
            if _table_exists(engine):
                return
        except Exception as exc:  # pragma: no cover - depends on service startup timing
            last_error = exc
        finally:
            engine.dispose()
        time.sleep(2)

    if last_error is not None:
        raise RuntimeError(f"Destination table {TARGET_TABLE} is not ready: {last_error}") from last_error
    raise RuntimeError(f"Destination table {TARGET_TABLE} was not created within {timeout_seconds} seconds")


def _prepare_records(df) -> list[dict]:
    records_df = df[INSERT_COLUMNS].copy()
    records_df = records_df.where(records_df.notna(), None)
    return records_df.to_dict(orient="records")


def _replace_incidents(engine, df) -> None:
    records = _prepare_records(df)

    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {TARGET_TABLE} RESTART IDENTITY"))

        for start_idx in range(0, len(records), 5000):
            batch = records[start_idx : start_idx + 5000]
            if batch:
                conn.execute(INSERT_SQL, batch)

        conn.execute(
            text(
                f"UPDATE {TARGET_TABLE} "
                "SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326) "
                "WHERE geom IS NULL AND lat IS NOT NULL AND lon IS NOT NULL"
            )
        )


def _run_pipeline(*, auto_triggered: bool) -> dict:
    if not pipeline_lock.acquire(blocking=False):
        raise RuntimeError("Pipeline is already running")

    start_time = time.time()
    input_path = None
    _set_status(
        status="running",
        error=None,
        rows_processed=0,
        rows_cleaned=0,
        duration_seconds=0,
        source_file=None,
        auto_import_enabled=AUTO_IMPORT_ENABLED,
        auto_import_triggered=auto_triggered,
    )

    try:
        input_path = _resolve_input_path()
        _set_status(source_file=_relative_source_name(input_path))

        raw_df = read_raw_data(input_path)
        raw_count = len(raw_df)

        cleaned_df = clean_raw_data(raw_df)
        prepared_df = add_features(cleaned_df)

        engine = _create_engine()
        try:
            if not _table_exists(engine):
                raise RuntimeError(f"Destination table {TARGET_TABLE} does not exist")
            _replace_incidents(engine, prepared_df)
        finally:
            engine.dispose()

        payload = _mark_terminal_status(
            status="completed",
            start_time=start_time,
            input_path=input_path,
            auto_triggered=auto_triggered,
            rows_processed=raw_count,
            rows_cleaned=len(prepared_df),
        )
        return {
            "status": payload["status"],
            "rows_processed": payload["rows_processed"],
            "rows_cleaned": payload["rows_cleaned"],
            "source_file": payload["source_file"],
            "auto_import_triggered": payload["auto_import_triggered"],
        }
    except Exception as exc:
        payload = _mark_terminal_status(
            status="failed",
            start_time=start_time,
            input_path=input_path,
            auto_triggered=auto_triggered,
            error=str(exc),
        )
        raise RuntimeError(payload["error"]) from exc
    finally:
        pipeline_lock.release()


def _auto_import_if_needed() -> None:
    start_time = time.time()
    input_path = None

    if not AUTO_IMPORT_ENABLED:
        _mark_terminal_status(
            status="skipped",
            start_time=start_time,
            input_path=None,
            auto_triggered=False,
        )
        return

    try:
        _wait_for_destination_table()

        engine = _create_engine()
        try:
            existing_rows = _count_incidents(engine)
        finally:
            engine.dispose()

        try:
            input_path = _resolve_input_path()
        except FileNotFoundError:
            input_path = None

        if existing_rows > 0:
            _mark_terminal_status(
                status="skipped",
                start_time=start_time,
                input_path=input_path,
                auto_triggered=True,
            )
            return

        if input_path is None:
            raise FileNotFoundError(
                f"No supported input file found in {DATA_DIR}. Expected one of: {', '.join(SUPPORTED_FILENAMES)}"
            )

        _run_pipeline(auto_triggered=True)
    except Exception as exc:
        _mark_terminal_status(
            status="failed",
            start_time=start_time,
            input_path=input_path,
            auto_triggered=True,
            error=str(exc),
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global startup_task
    if AUTO_IMPORT_ENABLED:
        startup_task = asyncio.create_task(asyncio.to_thread(_auto_import_if_needed))
    yield
    if startup_task is not None and not startup_task.done():
        startup_task.cancel()


app = FastAPI(title="ETL Service", version="0.1.0", lifespan=lifespan)


@app.get("/etl/status")
def get_status():
    """Return the current pipeline status and last run statistics."""
    return pipeline_status


@app.post("/etl/run-pipeline")
def run_pipeline():
    """Execute the full ETL pipeline: clean -> feature engineer -> load to DB."""
    try:
        return _run_pipeline(auto_triggered=False)
    except RuntimeError as exc:
        detail = str(exc)
        status_code = 409 if detail == "Pipeline is already running" else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
