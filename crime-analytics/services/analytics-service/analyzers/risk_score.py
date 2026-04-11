"""
Risk score formula:
    Risk = w1 * R_norm + w2 * D_norm + w3 * T_norm

Where:
    R_norm = min-max normalised crime rate
    D_norm = min-max normalised density
    T_norm = 0.5 + 0.5 * sign(slope) * min(1, abs(slope) / threshold)
    w1 = 0.4, w2 = 0.35, w3 = 0.25

Risk levels (percentile-based):
    <20 % = very_low, 20-40 % = low, 40-60 % = medium,
    60-80 % = high, >80 % = very_high
"""

W1 = 0.4
W2 = 0.35
W3 = 0.25
TREND_THRESHOLD = 5.0  # slope units per period considered "extreme"


def _min_max_norm(value: float, min_val: float, max_val: float) -> float:
    """Min-max normalise a single value to [0, 1]."""
    if max_val == min_val:
        return 0.5
    return (value - min_val) / (max_val - min_val)


def _trend_component(slope: float, threshold: float = TREND_THRESHOLD) -> float:
    """Convert trend slope into a 0-1 score centred at 0.5 (stable)."""
    sign = 1.0 if slope >= 0 else -1.0
    magnitude = min(1.0, abs(slope) / threshold)
    return 0.5 + 0.5 * sign * magnitude


def _risk_level(score: float, thresholds: dict) -> str:
    """Map a raw score to a risk level using pre-computed percentile thresholds."""
    if score <= thresholds["p20"]:
        return "very_low"
    if score <= thresholds["p40"]:
        return "low"
    if score <= thresholds["p60"]:
        return "medium"
    if score <= thresholds["p80"]:
        return "high"
    return "very_high"


def compute_risk_score(area_data: dict) -> dict:
    """Compute risk score for a single area (pre-normalised values required).

    ``area_data`` must contain keys:
        rate_norm, density_norm, trend_slope

    Returns dict with risk_score, risk_level placeholder, and components.
    """
    r_norm = area_data["rate_norm"]
    d_norm = area_data["density_norm"]
    t_norm = _trend_component(area_data["trend_slope"])

    score = W1 * r_norm + W2 * d_norm + W3 * t_norm

    return {
        "area_name": area_data["area_name"],
        "risk_score": round(score, 4),
        "risk_level": "",  # assigned later via percentile thresholds
        "components": {
            "rate_component": round(W1 * r_norm, 4),
            "density_component": round(W2 * d_norm, 4),
            "trend_component": round(W3 * t_norm, 4),
        },
    }
