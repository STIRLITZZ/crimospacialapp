import pandas as pd


def _numeric_bin(series: pd.Series, bins: int = 10) -> pd.Series:
    if series.nunique(dropna=True) <= 1:
        return pd.Series(0, index=series.index, dtype="int64")

    bucketed = pd.cut(
        series,
        bins=bins,
        labels=False,
        include_lowest=True,
        duplicates="drop",
    )
    return bucketed.fillna(0).astype(int)


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived fields used by the shared analytics schema."""
    result = df.copy()
    result["lat_bin"] = _numeric_bin(result["lat"])
    result["lon_bin"] = _numeric_bin(result["lon"])
    return result
