import pandas as pd


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived analytical features to the cleaned crime DataFrame."""

    # 1. Spatial binning — divide LAT and LON into 10 intervals
    df["LatBin"] = pd.cut(df["LAT"], bins=10).astype(str)
    df["LonBin"] = pd.cut(df["LON"], bins=10).astype(str)

    # 2. Group rare crime descriptions (< 25 occurrences) into "OTHER"
    counts = df["Crm Cd Desc"].value_counts()
    rare = counts[counts < 25].index
    df["Crm Cd Desc"] = df["Crm Cd Desc"].where(
        ~df["Crm Cd Desc"].isin(rare), "OTHER"
    )

    # 3. Part classification: Part 1 (serious, code < 900), Part 2 (less serious)
    df["Part"] = df["Crm Cd"].apply(lambda c: 1 if c < 900 else 2)

    return df
