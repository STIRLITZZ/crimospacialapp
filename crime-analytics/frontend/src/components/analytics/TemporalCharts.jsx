import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

const YEAR_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

export default function TemporalCharts({
  monthlyData,
  weekdayData,
  hourlyData,
  loading,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton /><Skeleton /><Skeleton /><Skeleton />
      </div>
    );
  }

  // ── Monthly trend (year overlay) ───────────────────────
  const byYear = {};
  (monthlyData || []).forEach(({ year, month, count }) => {
    if (!byYear[year]) byYear[year] = {};
    byYear[year][month] = count;
  });
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a).slice(0, 5);

  const monthlyChart = Array.from({ length: 12 }, (_, i) => {
    const row = { month: MONTH_LABELS[i] };
    years.forEach((y) => { row[y] = byYear[y]?.[i + 1] || 0; });
    return row;
  });

  // ── Seasonality (monthly aggregate) ────────────────────
  const monthAgg = Array(12).fill(0);
  (monthlyData || []).forEach(({ month, count }) => {
    if (month >= 1 && month <= 12) monthAgg[month - 1] += count;
  });
  const seasonality = MONTH_LABELS.map((m, i) => ({ month: m, count: monthAgg[i] }));

  // ── Weekday distribution ───────────────────────────────
  const dayAgg = Array(7).fill(0);
  (weekdayData || []).forEach(({ weekday, count }) => {
    if (weekday >= 0 && weekday < 7) dayAgg[weekday] += count;
  });
  const weekdayChart = DAY_LABELS.map((d, i) => ({ day: d, count: dayAgg[i] }));

  // ── Hourly distribution ────────────────────────────────
  const hourAgg = Array(24).fill(0);
  (hourlyData || []).forEach(({ hour, count }) => {
    if (hour >= 0 && hour < 24) hourAgg[hour] += count;
  });
  const hourlyChart = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    count: hourAgg[h],
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly trend multi-year */}
      <Card title="Monthly Trend (Year Overlay)" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={monthlyChart} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
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
      </Card>

      {/* Seasonality */}
      <Card title="Monthly Seasonality">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seasonality}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weekday */}
      <Card title="Day of Week Distribution">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={weekdayChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Hourly */}
      <Card title="Hourly Distribution (24h)" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
