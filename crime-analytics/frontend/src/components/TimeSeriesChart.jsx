import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MONTHS_SHORT_RO } from "../lib/translations";

const YEAR_COLORS = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-tertiary)",
  "var(--chart-quaternary)",
  "var(--chart-danger)",
];
const AXIS_TICK = { fill: "var(--chart-axis)", fontSize: 11 };
const LEGEND_STYLE = { fontSize: 12, color: "var(--text-soft)" };
const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(var(--shadow-rgb), 0.16)",
};

export default function TimeSeriesChart({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px] animate-pulse">
        <div className="h-3 w-40 bg-white/10 rounded mb-4" />
        <div className="h-[300px] bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px]">
        <h3 className="text-white font-semibold mb-3">Tendinta lunara</h3>
        <p className="text-gray-500 text-sm">Nu exista date temporale disponibile.</p>
      </div>
    );
  }

  // Pivot: group by month, overlay last N years
  const byYear = {};
  data.forEach(({ year, month, count }) => {
    if (!byYear[year]) byYear[year] = {};
    byYear[year][month] = count;
  });

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const row = { month: MONTHS_SHORT_RO[i] };
    years.forEach((y) => {
      row[y] = byYear[y]?.[i + 1] || 0;
    });
    return row;
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px]">
      <h3 className="text-white font-semibold mb-3">Tendinta lunara</h3>
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={chartData} margin={{ left: 0, right: 10 }}>
          <XAxis dataKey="month" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          {years.map((y, i) => (
            <Line
              key={y}
              type="monotone"
              dataKey={y}
              stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
              strokeWidth={2}
              dot={false}
              name={String(y)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
