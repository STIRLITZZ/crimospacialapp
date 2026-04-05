import pandas as pd

KEEP_COLUMNS = [
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


def clean_raw_data(input_path: str) -> pd.DataFrame:
    """Read the raw LAPD crime CSV and return a cleaned DataFrame."""

    # 1. Read CSV
    df = pd.read_csv(input_path)

    # 2. Keep only required columns
    df = df[KEEP_COLUMNS]

    # 3. Convert DATE OCC to datetime
    df["DATE OCC"] = pd.to_datetime(df["DATE OCC"], format="mixed")

    # 4. Extract derived time columns
    df["Year"] = df["DATE OCC"].dt.year
    df["Month"] = df["DATE OCC"].dt.month
    df["Day"] = df["DATE OCC"].dt.day
    df["Hour"] = (df["TIME OCC"] // 100).astype(int).clip(0, 23)

    # 5. Additional time features
    df["Quarter"] = df["DATE OCC"].dt.quarter
    df["Weekday"] = df["DATE OCC"].dt.day_name()
    df["IsWeekend"] = df["DATE OCC"].dt.dayofweek >= 5
    df["IsNight"] = df["Hour"].apply(lambda h: h >= 22 or h < 6)

    # 6. Standardize AREA NAME to uppercase
    df["AREA NAME"] = df["AREA NAME"].str.upper()

    # 7. Remove rows with invalid coordinates (LAT=0 or LON=0)
    df = df[(df["LAT"] != 0) & (df["LON"] != 0)]

    # 8. Remove duplicates based on DR_NO
    df = df.drop_duplicates(subset=["DR_NO"])

    return df
