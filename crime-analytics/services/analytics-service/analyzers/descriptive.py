from typing import List

import numpy as np
from scipy import stats


def compute_crime_rate(incidents_count: int, population: int) -> float:
    """Crime rate per 100,000 inhabitants."""
    if population <= 0:
        return 0.0
    return (incidents_count / population) * 100_000


def compute_density(incidents_count: int, area_sq_km: float) -> float:
    """Crime density: incidents per square kilometre."""
    if area_sq_km <= 0:
        return 0.0
    return incidents_count / area_sq_km


def compute_trend(time_series: List[dict]) -> dict:
    """Linear regression on a time series of {period, count} dicts.

    Returns slope, direction, r_squared, and p_value.
    """
    if len(time_series) < 2:
        return {
            "slope": 0.0,
            "direction": "stable",
            "r_squared": 0.0,
            "p_value": 1.0,
        }

    x = np.arange(len(time_series), dtype=float)
    y = np.array([p["count"] for p in time_series], dtype=float)

    result = stats.linregress(x, y)

    if result.pvalue > 0.05:
        direction = "stable"
    elif result.slope > 0:
        direction = "increasing"
    else:
        direction = "decreasing"

    return {
        "slope": round(float(result.slope), 4),
        "direction": direction,
        "r_squared": round(float(result.rvalue ** 2), 4),
        "p_value": round(float(result.pvalue), 6),
    }


def compute_seasonality(monthly_counts: List[int]) -> dict:
    """Analyse monthly variation and identify peak / low months.

    Expects a list of 12 integers (Jan=index 0 … Dec=index 11).
    Returns peak months, low months, seasonal index, and CV.
    """
    counts = np.array(monthly_counts, dtype=float)
    mean = counts.mean()

    if mean == 0:
        return {
            "peak_months": [],
            "low_months": [],
            "seasonal_index": [0.0] * len(monthly_counts),
            "coefficient_of_variation": 0.0,
        }

    seasonal_index = (counts / mean).tolist()
    std = counts.std()
    cv = float(std / mean)

    # Peak months: seasonal index > 1.1  (10 % above average)
    # Low months:  seasonal index < 0.9  (10 % below average)
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    peak_months = [
        month_names[i] for i, si in enumerate(seasonal_index) if si > 1.1
    ]
    low_months = [
        month_names[i] for i, si in enumerate(seasonal_index) if si < 0.9
    ]

    return {
        "peak_months": peak_months,
        "low_months": low_months,
        "seasonal_index": [round(s, 4) for s in seasonal_index],
        "coefficient_of_variation": round(cv, 4),
    }
