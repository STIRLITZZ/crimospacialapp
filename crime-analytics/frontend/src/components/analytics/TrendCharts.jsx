import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { fetchAreaTimeMatrix } from "../../services/api";

const AREA_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-5 ${className}`}>
      <h4 className="text-white font-semibold mb-4">{title}</h4>
      {children}
    </div>
  );
}

function Skeleton({ height = 300 }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
      <div className="h-3 w-40 bg-white/10 rounded mb-4" />
      <div className="bg-white/5 rounded-lg" style={{ height }} />
    </div>
  );
}

/** Simple linear regression: returns { slope, intercept, r2, points } */
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, points: [] };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  data.forEach(({ x, y }) => {
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; sumYY += y * y;
  });

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0, points: [] };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const ssRes = data.reduce((s, { x, y }) => s + (y - (slope * x + intercept)) ** 2, 0);
  const meanY = sumY / n;
  const ssTot = data.reduce((s, { y }) => s + (y - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // p-value approximation (t-test for slope ≠ 0)
  let pValue = 1;
  if (n > 2 && ssRes > 0) {
    const se = Math.sqrt(ssRes / (n - 2) / (sumXX - sumX * sumX / n));
    const t = slope / se;
    // Rough two-tailed p from t with n-2 df (simplified)
    const df = n - 2;
    pValue = Math.exp(-0.717 * Math.abs(t) - 0.416 * t * t / df);
    pValue = Math.min(1, Math.max(0, pValue * 2));
  }

  const points = data.map(({ x }) => ({
    x,
    trend: Math.round(slope * x + intercept),
  }));

  return { slope, intercept, r2, pValue, points };
}

export default function TrendCharts({
  monthlyData,
  areas,
  loading,
}) {
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [areaTrends, setAreaTrends] = useState({});
  const [trendLoading, setTrendLoading] = useState(false);

  // Toggle area selection (max 5)
  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : prev.length < 5 ? [...prev, area] : prev
    );
  };

  // Fetch area-specific trends
  useEffect(() => {
    if (selectedAreas.length === 0) { setAreaTrends({}); return; }
    setTrendLoading(true);
    Promise.all(
      selectedAreas.map((area) =>
        fetchAreaTimeMatrix(area)
          .then((data) => ({ area, data }))
          .catch(() => ({ area, data: [] }))
      )
    )
      .then((results) => {
        const trends = {};
        results.forEach(({ area, data }) => {
          // Build chronological sequence
          const sorted = [...data].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
          const byPeriod = {};
          sorted.forEach(({ year, month, count }) => {
            const key = `${year}-${String(month).padStart(2, "0")}`;
            byPeriod[key] = (byPeriod[key] || 0) + count;
          });
          trends[area] = byPeriod;
        });
        setAreaTrends(trends);
      })
      .finally(() => setTrendLoading(false));
  }, [selectedAreas]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Skeleton height={350} /><Skeleton height={200} /><Skeleton height={350} />
      </div>
    );
  }

  // ── Main trend with regression ─────────────────────────
  // Build chronological monthly sequence
  const sortedMonthly = [...(monthlyData || [])].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );
  const monthly = {};
  sortedMonthly.forEach(({ year, month, count }) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + count;
  });
  const periods = Object.keys(monthly).sort();
  const regData = periods.map((p, i) => ({ x: i, y: monthly[p], period: p }));
  const reg = linearRegression(regData);

  const trendChart = periods.map((p, i) => ({
    period: p,
    count: monthly[p],
    trend: reg.points[i]?.trend ?? 0,
  }));

  const direction = reg.slope > 0.5 ? "Increasing" : reg.slope < -0.5 ? "Decreasing" : "Stable";
  const dirColor = reg.slope > 0.5 ? "text-red-400" : reg.slope < -0.5 ? "text-green-400" : "text-gray-400";

  // ── Multi-area trend comparison ────────────────────────
  const allPeriods = new Set();
  Object.values(areaTrends).forEach((t) => Object.keys(t).forEach((p) => allPeriods.add(p)));
  const sortedPeriods = [...allPeriods].sort();

  const multiChart = sortedPeriods.map((p) => {
    const row = { period: p };
    selectedAreas.forEach((area) => {
      row[area] = areaTrends[area]?.[p] || 0;
    });
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Main trend with regression line */}
      <Card title="Overall Crime Trend with Regression">
        {trendChart.length === 0 ? (
          <p className="text-gray-500 text-sm">No time series data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendChart} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="period"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                interval={Math.max(0, Math.floor(trendChart.length / 12) - 1)}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                name="Trend Line"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Trend Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Direction</p>
          <p className={`text-lg font-bold ${dirColor}`}>{direction}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Slope</p>
          <p className="text-lg font-bold text-white font-mono">{reg.slope.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">R²</p>
          <p className="text-lg font-bold text-white font-mono">{reg.r2.toFixed(4)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">p-value</p>
          <p className="text-lg font-bold text-white font-mono">
            {reg.pValue != null ? (reg.pValue < 0.001 ? "<0.001" : reg.pValue.toFixed(4)) : "N/A"}
          </p>
        </div>
      </div>

      {/* Multi-area trend comparison */}
      <Card title="Trend Comparison by Area">
        <div className="flex flex-wrap gap-2 mb-4">
          {(areas || []).slice(0, 21).map((area) => (
            <button
              key={area}
              onClick={() => toggleArea(area)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedAreas.includes(area)
                  ? "bg-blue-600/20 border-blue-500 text-blue-300"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
        <p className="text-gray-500 text-xs mb-3">
          Select up to 5 areas to compare. {selectedAreas.length}/5 selected.
        </p>

        {trendLoading && (
          <div className="h-[300px] bg-white/5 rounded-lg animate-pulse" />
        )}

        {!trendLoading && multiChart.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={multiChart} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="period"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                interval={Math.max(0, Math.floor(multiChart.length / 12) - 1)}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
              {selectedAreas.map((area, i) => (
                <Line
                  key={area}
                  type="monotone"
                  dataKey={area}
                  stroke={AREA_COLORS[i % AREA_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {!trendLoading && selectedAreas.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            Select areas above to compare their trends.
          </p>
        )}
      </Card>
    </div>
  );
}
