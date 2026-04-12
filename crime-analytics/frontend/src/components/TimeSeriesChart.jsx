import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const YEAR_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

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
        <h3 className="text-white font-semibold mb-3">Monthly Trend</h3>
        <p className="text-gray-500 text-sm">No time series data available.</p>
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
    .sort((a, b) => b - a)
    .slice(0, 3);

  const MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const row = { month: MONTH_LABELS[i] };
    years.forEach((y) => {
      row[y] = byYear[y]?.[i + 1] || 0;
    });
    return row;
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px]">
      <h3 className="text-white font-semibold mb-3">Monthly Trend</h3>
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={chartData} margin={{ left: 0, right: 10 }}>
          <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#d1d5db" }}
          />
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
