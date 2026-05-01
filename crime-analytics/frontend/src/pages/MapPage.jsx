import { useEffect, useState, useCallback, useRef } from "react";
import { useFilters } from "../context/FilterContext";
import { useEtlStatus } from "../context/EtlStatusContext";
import {
  fetchGeoJSON,
  fetchHeatmapData,
  fetchClusters,
  fetchIncidentPoints,
} from "../services/api";
import CrimeMap from "../components/map/CrimeMap";
import MapFilters from "../components/map/MapFilters";
import { DataImportPlaceholder } from "../components/DataImportState";

const DEFAULT_FILTERS = {
  crm_cd_desc: "",
  year: "",
  month: "",
  hour_from: 0,
  hour_to: 23,
  is_weekend: false,
  is_night: false,
};

const AUTO_APPLY_DELAY_MS = 250;
const DOT_MAP_LAYER = "Dot Map";
const POINTS_LAYER = "Points";

export default function MapPage() {
  const {
    crimeTypes,
    dateRange,
    selectedArea,
    selectedCrimeType,
    yearRange,
  } = useFilters();
  const { isWaitingForImport, statusInfo, isChecking, dataVersion } = useEtlStatus();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeLayer, setActiveLayer] = useState("Choropleth");

  const [geojson, setGeojson] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [pointsData, setPointsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [clickedArea, setClickedArea] = useState(null);

  const boundsRef = useRef(null);
  const filtersRef = useRef(filters);
  const activeLayerRef = useRef(activeLayer);
  const hasDataRef = useRef(false);
  const mapRequestRef = useRef(0);
  const pointsRequestRef = useRef(0);

  filtersRef.current = filters;
  activeLayerRef.current = activeLayer;
  hasDataRef.current = Boolean(geojson || heatmapData || clusterData || pointsData);

  const buildParams = useCallback(
    (localFilters = filtersRef.current) => {
      const params = {};

      if (selectedArea) params.area_name = selectedArea;
      if (selectedCrimeType) params.crm_cd_desc = selectedCrimeType;
      if (yearRange.from) params.year_from = yearRange.from;
      if (yearRange.to) params.year_to = yearRange.to;

      if (localFilters.crm_cd_desc) params.crm_cd_desc = localFilters.crm_cd_desc;
      if (localFilters.year) {
        const year = parseInt(localFilters.year, 10);
        params.year_from = year;
        params.year_to = year;
      }
      if (localFilters.month) params.month = parseInt(localFilters.month, 10);
      if (localFilters.hour_from > 0) params.hour_from = localFilters.hour_from;
      if (localFilters.hour_to < 23) params.hour_to = localFilters.hour_to;
      if (localFilters.is_weekend) params.is_weekend = true;
      if (localFilters.is_night) params.is_night = true;

      return params;
    },
    [selectedArea, selectedCrimeType, yearRange.from, yearRange.to]
  );

  const fetchPointsForBounds = useCallback(
    async (params, bounds, layer = activeLayerRef.current) => {
      if (!bounds) {
        setPointsData(null);
        return;
      }

      const requestId = ++pointsRequestRef.current;

      try {
        const data = await fetchIncidentPoints({
          ...params,
          lat_min: bounds.lat_min,
          lat_max: bounds.lat_max,
          lon_min: bounds.lon_min,
          lon_max: bounds.lon_max,
          limit: layer === DOT_MAP_LAYER ? 12000 : 4000,
          sample_target: layer === DOT_MAP_LAYER ? 1200 : undefined,
        });

        if (requestId !== pointsRequestRef.current) return;
        setPointsData(data);
      } catch {
        if (requestId !== pointsRequestRef.current) return;
        setPointsData(null);
      }
    },
    []
  );

  const loadMapData = useCallback(
    async (params, layer) => {
      const requestId = ++mapRequestRef.current;
      setError(null);

      if (hasDataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const requests = [
        fetchGeoJSON(params)
          .then((data) => ({ key: "geojson", data }))
          .catch(() => ({ key: "geojson", data: null })),
      ];

      if (layer === "Heatmap") {
        requests.push(
          fetchHeatmapData(params)
            .then((data) => ({ key: "heatmap", data }))
            .catch(() => ({ key: "heatmap", data: null }))
        );
      }

      if (layer === "Clusters") {
        requests.push(
          fetchClusters(params)
            .then((data) => ({ key: "clusters", data }))
            .catch(() => ({ key: "clusters", data: null }))
        );
      }

      const results = await Promise.all(requests);
      if (requestId !== mapRequestRef.current) return;

      const nextGeojson =
        results.find((result) => result.key === "geojson")?.data ?? null;
      const nextHeatmap =
        results.find((result) => result.key === "heatmap")?.data ?? null;
      const nextClusters =
        results.find((result) => result.key === "clusters")?.data ?? null;

      setGeojson(nextGeojson);
      setHeatmapData(layer === "Heatmap" ? nextHeatmap : null);
      setClusterData(layer === "Clusters" ? nextClusters : null);

      if (layer !== POINTS_LAYER && layer !== DOT_MAP_LAYER) {
      setPointsData(null);
      }

      if (
        !nextGeojson &&
        !(layer === "Heatmap" && nextHeatmap) &&
        !(layer === "Clusters" && nextClusters) &&
        layer !== POINTS_LAYER &&
        layer !== DOT_MAP_LAYER
      ) {
        setError("Nu am putut incarca datele pentru harta. Verifica daca serviciile backend ruleaza.");
      }

      setLoading(false);
      setRefreshing(false);
    },
    [fetchPointsForBounds]
  );

  const handleBoundsChange = useCallback(
    (bounds) => {
      boundsRef.current = bounds;

      if (
        activeLayerRef.current !== POINTS_LAYER &&
        activeLayerRef.current !== DOT_MAP_LAYER
      ) {
        return;
      }

      fetchPointsForBounds(buildParams(filtersRef.current), bounds, activeLayerRef.current);
    },
    [buildParams, fetchPointsForBounds]
  );

  const handleApply = useCallback(() => {
    setClickedArea(null);
    loadMapData(buildParams(filtersRef.current), activeLayerRef.current);
  }, [buildParams, loadMapData]);

  useEffect(() => {
    if (isWaitingForImport) return;

    const params = buildParams(filters);
    const timeoutId = setTimeout(
      () => loadMapData(params, activeLayer),
      hasDataRef.current ? AUTO_APPLY_DELAY_MS : 0
    );

    return () => clearTimeout(timeoutId);
  }, [activeLayer, buildParams, dataVersion, filters, isWaitingForImport, loadMapData]);

  useEffect(() => {
    if (
      (activeLayer !== POINTS_LAYER && activeLayer !== DOT_MAP_LAYER) ||
      !boundsRef.current
    ) {
      return;
    }
    fetchPointsForBounds(buildParams(filters), boundsRef.current, activeLayer);
  }, [activeLayer, buildParams, dataVersion, fetchPointsForBounds, filters]);

  const years = [];
  if (dateRange.min && dateRange.max) {
    for (let y = dateRange.max; y >= dateRange.min; y -= 1) {
      years.push(y);
    }
  }

  if (isWaitingForImport) {
    return <DataImportPlaceholder statusInfo={statusInfo} isChecking={isChecking} />;
  }

  if (error && !geojson && !heatmapData && !clusterData && !pointsData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center max-w-md">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
          >
            Reincearca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] -m-6 relative">
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-gray-900/60 flex items-center justify-center">
          <div className="bg-gray-800 border border-white/10 rounded-xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-300 text-sm">Se incarca datele pentru harta...</span>
          </div>
        </div>
      )}

      {refreshing && !loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1400]">
          <div className="bg-gray-900/85 backdrop-blur border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">
            Se actualizeaza harta...
          </div>
        </div>
      )}

      <CrimeMap
        geojson={geojson}
        heatmapData={heatmapData}
        clusterData={clusterData}
        pointsData={pointsData}
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        onAreaClick={setClickedArea}
        onBoundsChange={handleBoundsChange}
      />

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
