import os
import time
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine

from pipelines.cleaner import clean_raw_data
from pipelines.feature_engineer import add_features

app = FastAPI(title="ETL Service", version="0.1.0")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crime_user:crime_pass@db:5432/crime_db")
DATA_DIR = os.getenv("DATA_DIR", "/app/data/raw")
CSV_FILENAME = "Crime_Data_from_2020_to_Present.csv"

# In-memory pipeline run status
pipeline_status: dict = {
    "last_run_at": None,
    "status": "idle",
    "rows_processed": 0,
    "rows_cleaned": 0,
    "duration_seconds": 0,
    "error": None,
}


@app.get("/etl/status")
def get_status():
    """Return the current pipeline status and last run statistics."""
    return pipeline_status


@app.post("/etl/run-pipeline")
def run_pipeline():
    """Execute the full ETL pipeline: clean -> feature engineer -> load to DB."""

    if pipeline_status["status"] == "running":
        raise HTTPException(status_code=409, detail="Pipeline is already running")

    pipeline_status["status"] = "running"
    pipeline_status["error"] = None
    start = time.time()

    try:
        input_path = os.path.join(DATA_DIR, CSV_FILENAME)
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"{CSV_FILENAME} not found in {DATA_DIR}")

        # Count raw rows (excluding header)
        with open(input_path, "r") as f:
            raw_count = sum(1 for _ in f) - 1

        # Run cleaning pipeline
        df = clean_raw_data(input_path)

        # Run feature engineering
        df = add_features(df)

        # Write to PostgreSQL
        engine = create_engine(DATABASE_URL)
        df.to_sql("crime_data", engine, if_exists="replace", index=False)
        engine.dispose()

        duration = round(time.time() - start, 2)
        pipeline_status.update({
            "last_run_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "rows_processed": raw_count,
            "rows_cleaned": len(df),
            "duration_seconds": duration,
            "error": None,
        })

        return {
            "status": "success",
            "rows_processed": raw_count,
            "rows_cleaned": len(df),
        }

    except Exception as exc:
        pipeline_status.update({
            "status": "failed",
            "error": str(exc),
            "duration_seconds": round(time.time() - start, 2),
        })
        raise HTTPException(status_code=500, detail=str(exc))
