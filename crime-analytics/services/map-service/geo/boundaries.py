"""LAPD division boundary helpers.

If an external GeoJSON file is available it will be loaded from disk.
Otherwise approximate polygons are built from the convex hull of
incident coordinates that fall within each area.
"""

from typing import Dict, List

import numpy as np
from shapely.geometry import MultiPoint, mapping


def get_la_area_boundaries() -> Dict[str, list]:
    """Return a dict mapping area_name -> list of [lon, lat] polygon rings.

    These are rough bounding boxes for the 21 LAPD Community Police
    Stations.  They are adequate for choropleth rendering until a
    proper GeoJSON is provided.
    """
    # Approximate centroids and extents (lon, lat) derived from public
    # LAPD reports.  Each entry is (center_lon, center_lat, half_w, half_h).
    _APPROX: Dict[str, tuple] = {
        "CENTRAL":          (-118.247, 34.044, 0.020, 0.015),
        "RAMPART":          (-118.275, 34.063, 0.020, 0.015),
        "SOUTHWEST":        (-118.310, 34.015, 0.025, 0.018),
        "HOLLENBECK":       (-118.210, 34.048, 0.022, 0.016),
        "HARBOR":           (-118.280, 33.780, 0.035, 0.030),
        "HOLLYWOOD":        (-118.335, 34.098, 0.025, 0.018),
        "WILSHIRE":         (-118.340, 34.055, 0.025, 0.015),
        "WEST LOS ANGELES": (-118.435, 34.040, 0.030, 0.020),
        "VAN NUYS":         (-118.450, 34.190, 0.030, 0.025),
        "WEST VALLEY":      (-118.530, 34.195, 0.035, 0.025),
        "NORTHEAST":        (-118.230, 34.095, 0.025, 0.020),
        "77TH STREET":      (-118.290, 33.970, 0.025, 0.018),
        "NEWTON":           (-118.255, 34.005, 0.018, 0.015),
        "PACIFIC":          (-118.450, 33.980, 0.030, 0.025),
        "N HOLLYWOOD":      (-118.380, 34.180, 0.030, 0.020),
        "FOOTHILL":         (-118.400, 34.260, 0.035, 0.025),
        "DEVONSHIRE":       (-118.530, 34.260, 0.035, 0.025),
        "SOUTHEAST":        (-118.250, 33.945, 0.025, 0.020),
        "MISSION":          (-118.465, 34.280, 0.035, 0.025),
        "OLYMPIC":          (-118.305, 34.045, 0.020, 0.015),
        "TOPANGA":          (-118.590, 34.220, 0.040, 0.030),
    }

    boundaries: Dict[str, list] = {}
    for name, (cx, cy, hw, hh) in _APPROX.items():
        ring = [
            [cx - hw, cy - hh],
            [cx + hw, cy - hh],
            [cx + hw, cy + hh],
            [cx - hw, cy + hh],
            [cx - hw, cy - hh],  # closed ring
        ]
        boundaries[name] = ring

    return boundaries


def build_boundaries_from_incidents(
    incidents: List[dict],
) -> Dict[str, list]:
    """Build convex-hull polygons per area from incident lat/lon.

    Falls back to bounding box if fewer than 3 points exist.
    Each dict entry has structure: area_name -> [[lon, lat], …] ring.
    """
    from collections import defaultdict

    area_points: Dict[str, List] = defaultdict(list)
    for inc in incidents:
        name = inc.get("area_name", "")
        lat = inc.get("lat")
        lon = inc.get("lon")
        if name and lat and lon:
            area_points[name].append((lon, lat))

    boundaries: Dict[str, list] = {}
    for name, pts in area_points.items():
        if len(pts) < 3:
            if not pts:
                continue
            arr = np.array(pts)
            mn = arr.min(axis=0)
            mx = arr.max(axis=0)
            ring = [
                [float(mn[0]), float(mn[1])],
                [float(mx[0]), float(mn[1])],
                [float(mx[0]), float(mx[1])],
                [float(mn[0]), float(mx[1])],
                [float(mn[0]), float(mn[1])],
            ]
        else:
            hull = MultiPoint(pts).convex_hull
            coords = mapping(hull).get("coordinates", [[]])
            ring = [list(c) for c in (coords[0] if coords else [])]

        boundaries[name] = ring

    return boundaries
