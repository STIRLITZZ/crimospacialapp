import { useEffect, useState, useCallback } from "react";
import { useFilters } from "../context/FilterContext";
import {
  fetchDashboard,
  fetchTimeSeries,
  fetchHourlyDistribution,
  fetchStatsByArea,
  fetchStatsByCrimeType,
} from "../services/api";
import TabNavigation from "../components/ui/TabNavigation";
import TemporalCharts from "../components/analytics/TemporalCharts";
import SpatialCharts from "../components/analytics/SpatialCharts";
import CrimeTypeCharts from "../components/analytics/CrimeTypeCharts";
import TrendCharts from "../components/analytics/TrendCharts";

const TABS = [
  { key: "temporal", label: "Temporal Analysis" },
  { key: "spatial", label: "Spatial Analysis" },
  { key: "crimes", label: "Crime Types" },
  { key: "trends", label: "Trends" },
];

export default function Analytics() {
  const { buildFilterParams, areas } = useFilters();
  const [activeTab, setActiveTab] = useState("temporal");

  const [monthlyData, setMonthlyData] = useState(null);
  const [weekdayData, setWeekdayData] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [areaStats, setAreaStats] = useState(null);
  const [crimeTypes, setCrimeTypes] = useState(null);
  const [riskScores, setRiskScores] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const params = buildFilterParams();

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);

    Promise.all([
      fetchTimeSeries({ ...params, group_by: "month" }).catch(() => []),
      fetchTimeSeries({ ...params, group_by: "weekday" }).catch(() => []),
      fetchHourlyDistribution(params).catch(() => []),
      fetchStatsByArea(params).catch(() => []),
      fetchStatsByCrimeType(params, 50).catch(() => []),
      fetchDashboard(params).catch(() => null),
    ])
      .then(([monthly, weekday, hourly, areas, crimes, dashboard]) => {
        setMonthlyData(monthly);
        setWeekdayData(weekday);
        setHourlyData(hourly);
        setAreaStats(areas);
        setCrimeTypes(crimes);
        setRiskScores(dashboard?.risk_scores || []);

        if (!monthly.length && !weekday.length && !hourly.length) {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm mb-3">
            Unable to load analytics data. Make sure the backend services are running.
          </p>
          <button
            onClick={loadData}
            className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === "temporal" && (
        <TemporalCharts
          monthlyData={monthlyData}
          weekdayData={weekdayData}
          hourlyData={hourlyData}
          loading={loading}
        />
      )}

      {activeTab === "spatial" && (
        <SpatialCharts
          areaStats={areaStats}
          riskScores={riskScores}
          areas={areas}
          loading={loading}
        />
      )}

      {activeTab === "crimes" && (
        <CrimeTypeCharts
          crimeTypes={crimeTypes}
          areaStats={areaStats}
          loading={loading}
        />
      )}

      {activeTab === "trends" && (
        <TrendCharts
          monthlyData={monthlyData}
          areas={areas}
          loading={loading}
        />
      )}
    </div>
  );
}
