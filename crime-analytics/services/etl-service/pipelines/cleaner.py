from __future__ import annotations

import pandas as pd

RAW_COLUMNS = [
    "DR_NO",
    "DATE OCC",
    "TIME OCC",
    "AREA",
    "AREA NAME",
    "Crm Cd",
    "Crm Cd Desc",
    "Vict Age",
    "Vict Sex",
    "LAT",
    "LON",
]
DB_COLUMNS = [
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
]


def read_raw_data(input_path: str) -> pd.DataFrame:
    """Load raw crime data from CSV or Excel."""
    extension = input_path.lower().rsplit(".", 1)[-1]

    if extension == "csv":
        return pd.read_csv(input_path)
    if extension in {"xlsx", "xls"}:
        return pd.read_excel(input_path)

    raise ValueError(f"Unsupported file format for {input_path}")


def _normalize_input_frame(input_data: str | pd.DataFrame) -> pd.DataFrame:
    if isinstance(input_data, pd.DataFrame):
        df = input_data.copy()
    else:
        df = read_raw_data(input_data)

    df.columns = [str(col).strip() for col in df.columns]
    missing = [column for column in RAW_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    return df[RAW_COLUMNS].copy()


def clean_raw_data(input_data: str | pd.DataFrame) -> pd.DataFrame:
    """Read the raw LAPD dataset and return rows shaped for crime_incidents."""
    df = _normalize_input_frame(input_data)

    df["DR_NO"] = (
        df["DR_NO"]
        .astype("string")
        .str.strip()
        .str.replace(r"\.0$", "", regex=True)
        .replace({"": pd.NA, "nan": pd.NA, "NaN": pd.NA, "<NA>": pd.NA})
    )
    df["DATE OCC"] = pd.to_datetime(df["DATE OCC"], format="mixed", errors="coerce")
    df["TIME OCC"] = pd.to_numeric(df["TIME OCC"], errors="coerce")
    df["AREA"] = pd.to_numeric(df["AREA"], errors="coerce")
    df["Crm Cd"] = pd.to_numeric(df["Crm Cd"], errors="coerce")
    df["Vict Age"] = pd.to_numeric(df["Vict Age"], errors="coerce")
    df["LAT"] = pd.to_numeric(df["LAT"], errors="coerce")
    df["LON"] = pd.to_numeric(df["LON"], errors="coerce")

    df["AREA NAME"] = (
        df["AREA NAME"]
        .fillna("UNKNOWN")
        .astype(str)
        .str.strip()
        .replace({"": "UNKNOWN"})
        .str.upper()
    )
    df["Crm Cd Desc"] = (
        df["Crm Cd Desc"]
        .fillna("UNKNOWN")
        .astype(str)
        .str.strip()
        .replace({"": "UNKNOWN"})
    )
    df["Vict Sex"] = (
        df["Vict Sex"]
        .fillna("X")
        .astype(str)
        .str.strip()
        .str.upper()
        .replace({"": "X", "NAN": "X"})
        .str[0]
    )

    df = df.dropna(subset=["DR_NO", "DATE OCC", "AREA", "Crm Cd", "LAT", "LON"])
    df = df[(df["LAT"] != 0) & (df["LON"] != 0)]
    df = df.drop_duplicates(subset=["DR_NO"])

    df["TIME OCC"] = df["TIME OCC"].fillna(0).astype(int)
    df["Vict Age"] = df["Vict Age"].fillna(0).astype(int)
    df["AREA"] = df["AREA"].astype(int)
    df["Crm Cd"] = df["Crm Cd"].astype(int)

    df["Year"] = df["DATE OCC"].dt.year.astype(int)
    df["Month"] = df["DATE OCC"].dt.month.astype(int)
    df["Day"] = df["DATE OCC"].dt.day.astype(int)
    df["Hour"] = (df["TIME OCC"] // 100).clip(0, 23).astype(int)
    df["Quarter"] = df["DATE OCC"].dt.quarter.astype(int)
    df["Weekday"] = df["DATE OCC"].dt.dayofweek.astype(int)
    df["IsWeekend"] = (df["Weekday"] >= 5).astype(bool)
    df["IsNight"] = df["Hour"].apply(lambda hour: hour >= 22 or hour < 6).astype(bool)

    df = df.rename(
        columns={
            "DR_NO": "dr_no",
            "DATE OCC": "date_occ",
            "AREA": "area",
            "AREA NAME": "area_name",
            "Crm Cd": "crm_cd",
            "Crm Cd Desc": "crm_cd_desc",
            "Vict Age": "vict_age",
            "Vict Sex": "vict_sex",
            "LAT": "lat",
            "LON": "lon",
            "Year": "year",
            "Month": "month",
            "Day": "day",
            "Hour": "hour",
            "Quarter": "quarter",
            "Weekday": "weekday",
            "IsWeekend": "is_weekend",
            "IsNight": "is_night",
        }
    )

    return df[DB_COLUMNS].copy()
