import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fetchAreaTimeMatrix } from "../../services/api";
import { translateTrendDirection } from "../../lib/translations";

const AREA_COLORS = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-tertiary)",
  "var(--chart-danger)",
  "#8b5cf6",
];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(var(--shadow-rgb), 0.16)",
};
const GRID_STROKE = "var(--grid-stroke)";
const X_TICK = { fill: "var(--chart-axis)", fontSize: 10 };
const Y_TICK = { fill: "var(--chart-axis)", fontSize: 11 };
const LEGEND_STYLE = { fontSize: 12, color: "var(--text-soft)" };

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

function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, points: [] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;
  data.forEach(({ x, y }) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  });

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0, points: [] };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = data.reduce(
    (sum, { x, y }) => sum + (y - (slope * x + intercept)) ** 2,
    0
  );
  const meanY = sumY / n;
  const ssTot = data.reduce((sum, { y }) => sum + (y - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  let pValue = 1;
  if (n > 2 && ssRes > 0) {
    const se = Math.sqrt(ssRes / (n - 2) / (sumXX - (sumX * sumX) / n));
    const t = slope / se;
    const df = n - 2;
    pValue = Math.exp(-0.717 * Math.abs(t) - (0.416 * t * t) / df);
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

  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((item) => item !== area)
        : prev.length < 5
        ? [...prev, area]
        : prev
    );
  };

  useEffect(() => {
    if (selectedAreas.length === 0) {
      setAreaTrends({});
      return;
    }

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
          const sorted = [...data].sort(
            (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
          );
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
        <Skeleton height={350} />
        <Skeleton height={200} />
        <Skeleton height={350} />
      </div>
    );
  }

  const sortedMonthly = [...(monthlyData || [])].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );
  const monthly = {};
  sortedMonthly.forEach(({ year, month, count }) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + count;
  });
  const periods = Object.keys(monthly).sort();
  const regData = periods.map((period, i) => ({
    x: i,
    y: monthly[period],
    period,
  }));
  const reg = linearRegression(regData);

  const trendChart = periods.map((period, i) => ({
    period,
    count: monthly[period],
    trend: reg.points[i]?.trend ?? 0,
  }));

  const direction =
    reg.slope > 0.5 ? "Increasing" : reg.slope < -0.5 ? "Decreasing" : "Stable";
  const dirColor =
    reg.slope > 0.5
      ? "text-red-400"
      : reg.slope < -0.5
      ? "text-green-400"
      : "text-gray-400";

  const allPeriods = new Set();
  Object.values(areaTrends).forEach((trend) => {
    Object.keys(trend).forEach((period) => allPeriods.add(period));
  });
  const sortedPeriods = [...allPeriods].sort();

  const multiChart = sortedPeriods.map((period) => {
    const row = { period };
    selectedAreas.forEach((area) => {
      row[area] = areaTrends[area]?.[period] || 0;
    });
    return row;
  });

  return (
    <div className="space-y-6">
      <Card title="Tendinta generala a infractiunilor cu regresie">
        {trendChart.length === 0 ? (
          <p className="text-gray-500 text-sm">Nu exista date temporale disponibile.</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendChart} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="period"
                tick={X_TICK}
                interval={Math.max(0, Math.floor(trendChart.length / 12) - 1)}
              />
              <YAxis tick={Y_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--chart-primary)"
                strokeWidth={2}
                dot={false}
                name="Valoare reala"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke="var(--chart-danger)"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                name="Linie de trend"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Directie</p>
          <p className={`text-lg font-bold ${dirColor}`}>
            {translateTrendDirection(direction)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Panta</p>
          <p className="text-lg font-bold text-white font-mono">{reg.slope.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">R2</p>
          <p className="text-lg font-bold text-white font-mono">{reg.r2.toFixed(4)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Valoare p</p>
          <p className="text-lg font-bold text-white font-mono">
            {reg.pValue != null
              ? reg.pValue < 0.001
                ? "<0.001"
                : reg.pValue.toFixed(4)
              : "N/A"}
          </p>
        </div>
      </div>

      <Card title="Comparatie de trend pe zone">
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
          Selecteaza pana la 5 zone pentru comparatie. {selectedAreas.length}/5 selectate.
        </p>

        {trendLoading && (
          <div className="h-[300px] bg-white/5 rounded-lg animate-pulse" />
        )}

        {!trendLoading && multiChart.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={multiChart} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="period"
                tick={X_TICK}
                interval={Math.max(0, Math.floor(multiChart.length / 12) - 1)}
              />
              <YAxis tick={Y_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
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
            Selecteaza zonele de mai sus pentru a compara tendintele lor.
          </p>
        )}
      </Card>
    </div>
  );
}
