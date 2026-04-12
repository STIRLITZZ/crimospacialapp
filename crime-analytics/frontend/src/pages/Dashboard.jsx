import { useEffect, useState, useCallback } from "react";
import { useFilters } from "../context/FilterContext";
import {
  fetchDashboard,
  fetchTimeSeries,
  fetchHourlyDistribution,
  fetchGeoJSON,
} from "../services/api";
import SummaryCard from "../components/SummaryCard";
import MiniMap from "../components/MiniMap";
import TopCrimesChart from "../components/TopCrimesChart";
import TimeSeriesChart from "../components/TimeSeriesChart";
import RiskTable from "../components/RiskTable";
import HourlyHeatmap from "../components/HourlyHeatmap";

const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

export default function Dashboard() {
  const { buildFilterParams } = useFilters();

  const [dashboard, setDashboard] = useState(null);
  const [timeSeries, setTimeSeries] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [geojson, setGeojson] = useState(null);

  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingTS, setLoadingTS] = useState(true);
  const [loadingHourly, setLoadingHourly] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(true);

  const [errorDash, setErrorDash] = useState(false);
  const [errorTS, setErrorTS] = useState(false);
  const [errorHourly, setErrorHourly] = useState(false);
  const [errorGeo, setErrorGeo] = useState(false);

  const params = buildFilterParams();

  const loadDashboard = useCallback(() => {
    setLoadingDash(true);
    setErrorDash(false);
    fetchDashboard(params)
      .then(setDashboard)
      .catch(() => { setDashboard(null); setErrorDash(true); })
      .finally(() => setLoadingDash(false));
  }, [params]);

  const loadTimeSeries = useCallback(() => {
    setLoadingTS(true);
    setErrorTS(false);
    fetchTimeSeries({ ...params, group_by: "month" })
      .then(setTimeSeries)
      .catch(() => { setTimeSeries(null); setErrorTS(true); })
      .finally(() => setLoadingTS(false));
  }, [params]);

  const loadHourly = useCallback(() => {
    setLoadingHourly(true);
    setErrorHourly(false);
    fetchHourlyDistribution(params)
      .then(setHourly)
      .catch(() => { setHourly(null); setErrorHourly(true); })
      .finally(() => setLoadingHourly(false));
  }, [params]);

  const loadGeoJSON = useCallback(() => {
    setLoadingGeo(true);
    setErrorGeo(false);
    fetchGeoJSON(params)
      .then(setGeojson)
      .catch(() => { setGeojson(null); setErrorGeo(true); })
      .finally(() => setLoadingGeo(false));
  }, [params]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadTimeSeries(); }, [loadTimeSeries]);
  useEffect(() => { loadHourly(); }, [loadHourly]);
  useEffect(() => { loadGeoJSON(); }, [loadGeoJSON]);

  // Derived data from dashboard response
  const summary = dashboard?.summary;
  const riskScores = dashboard?.risk_scores || [];
  const crimeTypes = dashboard?.crime_type_distribution || [];

  // Find highest risk area
  const highestRisk = riskScores.length > 0
    ? riskScores.reduce((a, b) => (a.risk_score > b.risk_score ? a : b))
    : null;

  // Determine trend from time series (compare last 2 years totals)
  let trend = null;
  if (timeSeries && timeSeries.length > 0) {
    const byYear = {};
    timeSeries.forEach(({ year, count }) => {
      byYear[year] = (byYear[year] || 0) + count;
    });
    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
    if (years.length >= 2) {
      trend = byYear[years[0]] > byYear[years[1]] ? "up" : "down";
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>

      {/* ROW 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {errorDash ? (
          <div className="col-span-full">
            <ErrorRetry message="Failed to load summary data" onRetry={loadDashboard} />
          </div>
        ) : (
          <>
            <SummaryCard
              label="Total Incidents"
              value={summary?.total_incidents ?? 0}
              trend={trend}
              loading={loadingDash}
            />
            <SummaryCard
              label="Highest Risk Area"
              value={highestRisk?.area_name || "N/A"}
              badge={
                highestRisk
                  ? {
                      text: highestRisk.risk_level,
                      color: RISK_COLORS[highestRisk.risk_level] || "#f39c12",
                    }
                  : null
              }
              small
              loading={loadingDash}
            />
            <SummaryCard
              label="Most Common Crime"
              value={summary?.most_common_crime || "N/A"}
              small
              loading={loadingDash}
            />
            <SummaryCard
              label="Active Period"
              value={summary?.date_range || "N/A"}
              small
              loading={loadingDash}
            />
          </>
        )}
      </div>

      {/* ROW 2: MiniMap (60%) + TopCrimesChart (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {errorGeo ? (
            <ErrorRetry message="Failed to load map data" onRetry={loadGeoJSON} />
          ) : (
            <MiniMap geojson={geojson} loading={loadingGeo} />
          )}
        </div>
        <div className="lg:col-span-2">
          {errorDash ? (
            <ErrorRetry message="Failed to load crime types" onRetry={loadDashboard} />
          ) : (
            <TopCrimesChart data={crimeTypes} loading={loadingDash} />
          )}
        </div>
      </div>

      {/* ROW 3: TimeSeriesChart (60%) + RiskTable (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {errorTS ? (
            <ErrorRetry message="Failed to load time series" onRetry={loadTimeSeries} />
          ) : (
            <TimeSeriesChart data={timeSeries} loading={loadingTS} />
          )}
        </div>
        <div className="lg:col-span-2">
          {errorDash ? (
            <ErrorRetry message="Failed to load risk scores" onRetry={loadDashboard} />
          ) : (
            <RiskTable scores={riskScores} loading={loadingDash} />
          )}
        </div>
      </div>

      {/* ROW 4: HourlyHeatmap (full width) */}
      {errorHourly ? (
        <ErrorRetry message="Failed to load hourly distribution" onRetry={loadHourly} />
      ) : (
        <HourlyHeatmap data={hourly} loading={loadingHourly} />
      )}
    </div>
  );
}

function ErrorRetry({ message, onRetry }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <p className="text-red-400 text-sm mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
