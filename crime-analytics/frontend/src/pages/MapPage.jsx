import { useEffect, useState, useCallback, useRef } from "react";
import { useFilters } from "../context/FilterContext";
import {
  fetchGeoJSON,
  fetchHeatmapData,
  fetchClusters,
  fetchIncidentPoints,
} from "../services/api";
import CrimeMap from "../components/map/CrimeMap";
import MapFilters from "../components/map/MapFilters";

const DEFAULT_FILTERS = {
  crm_cd_desc: "",
  year: "",
  month: "",
  hour_from: 0,
  hour_to: 23,
  is_weekend: false,
  is_night: false,
};

export default function MapPage() {
  const { crimeTypes, dateRange, selectedArea, setSelectedArea } = useFilters();

  // Local map filters (separate from global sidebar filters)
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Data states
  const [geojson, setGeojson] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [pointsData, setPointsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track selected area for popup details
  const [clickedArea, setClickedArea] = useState(null);

  // Track viewport bounds for points layer
  const boundsRef = useRef(null);

  // Build query params from local filters
  const buildParams = useCallback(() => {
    const params = {};
    if (filters.crm_cd_desc) params.crm_cd_desc = filters.crm_cd_desc;
    if (filters.year) {
      params.year_from = parseInt(filters.year, 10);
      params.year_to = parseInt(filters.year, 10);
    }
    if (filters.month) params.month = parseInt(filters.month, 10);
    if (filters.hour_from > 0) params.hour_from = filters.hour_from;
    if (filters.hour_to < 23) params.hour_to = filters.hour_to;
    if (filters.is_weekend) params.is_weekend = true;
    return params;
  }, [filters]);

  // Fetch all map data
  const loadData = useCallback(() => {
    const params = buildParams();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchGeoJSON(params).catch(() => null),
      fetchHeatmapData(params).catch(() => null),
      fetchClusters(params).catch(() => null),
    ])
      .then(([geo, heat, clusters]) => {
        setGeojson(geo);
        setHeatmapData(heat);
        setClusterData(clusters);
        if (!geo && !heat && !clusters) {
          setError("Unable to load map data. Check that backend services are running.");
        }
      })
      .finally(() => setLoading(false));
  }, [buildParams]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // If selectedArea from global context, set it in local filters
  useEffect(() => {
    if (selectedArea) {
      setFilters((prev) => ({ ...prev, crm_cd_desc: "" }));
      // We don't filter by area_name here since map shows all areas
      // but we could highlight it — for now just clear clicked area
    }
  }, [selectedArea]);

  // Fetch incident points when bounds change
  const handleBoundsChange = useCallback(
    (bounds) => {
      boundsRef.current = bounds;
      const params = buildParams();
      fetchIncidentPoints({
        ...params,
        lat_min: bounds.lat_min,
        lat_max: bounds.lat_max,
        lon_min: bounds.lon_min,
        lon_max: bounds.lon_max,
        limit: 5000,
      })
        .then(setPointsData)
        .catch(() => {});
    },
    [buildParams]
  );

  // Generate year options from date range
  const years = [];
  if (dateRange.min && dateRange.max) {
    for (let y = dateRange.max; y >= dateRange.min; y--) {
      years.push(y);
    }
  }

  const handleApply = () => {
    setClickedArea(null);
    loadData();
    // Re-fetch points for current bounds
    if (boundsRef.current) {
      handleBoundsChange(boundsRef.current);
    }
  };

  const handleAreaClick = (props) => {
    setClickedArea(props);
  };

  if (error && !geojson && !heatmapData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center max-w-md">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] -m-6 relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-gray-900/60 flex items-center justify-center">
          <div className="bg-gray-800 border border-white/10 rounded-xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-300 text-sm">Loading map data...</span>
          </div>
        </div>
      )}

      {/* Map */}
      <CrimeMap
        geojson={geojson}
        heatmapData={heatmapData}
        clusterData={clusterData}
        pointsData={pointsData}
        onAreaClick={handleAreaClick}
        onBoundsChange={handleBoundsChange}
      />

      {/* Left Panel — Filters + Area Details */}
      <MapFilters
        crimeTypes={crimeTypes}
        years={years}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApply}
        selectedArea={clickedArea}
        onClearArea={() => setClickedArea(null)}
      />
    </div>
  );
}
