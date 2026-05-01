import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  MONTHS_SHORT_RO,
  WEEKDAYS_SHORT_RO,
} from "../../lib/translations";

const YEAR_COLORS = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-tertiary)",
  "var(--chart-danger)",
  "#8b5cf6",
];
const MONTH_LABELS = [...MONTHS_SHORT_RO];
const DAY_LABELS = [...WEEKDAYS_SHORT_RO];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(var(--shadow-rgb), 0.16)",
};
const GRID_STROKE = "var(--grid-stroke)";
const X_TICK = { fill: "var(--chart-axis)", fontSize: 11 };
const X_TICK_SMALL = { fill: "var(--chart-axis)", fontSize: 10 };
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

export default function TemporalCharts({
  monthlyData,
  weekdayData,
  hourlyData,
  loading,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const byYear = {};
  (monthlyData || []).forEach(({ year, month, count }) => {
    if (!byYear[year]) byYear[year] = {};
    byYear[year][month] = count;
  });
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, 5);

  const monthlyChart = Array.from({ length: 12 }, (_, i) => {
    const row = { month: MONTH_LABELS[i] };
    years.forEach((y) => {
      row[y] = byYear[y]?.[i + 1] || 0;
    });
    return row;
  });

  const monthAgg = Array(12).fill(0);
  (monthlyData || []).forEach(({ month, count }) => {
    if (month >= 1 && month <= 12) monthAgg[month - 1] += count;
  });
  const seasonality = MONTH_LABELS.map((month, i) => ({
    month,
    count: monthAgg[i],
  }));

  const dayAgg = Array(7).fill(0);
  (weekdayData || []).forEach(({ weekday, count }) => {
    if (weekday >= 0 && weekday < 7) dayAgg[weekday] += count;
  });
  const weekdayChart = DAY_LABELS.map((day, i) => ({
    day,
    count: dayAgg[i],
  }));

  const hourAgg = Array(24).fill(0);
  (hourlyData || []).forEach(({ hour, count }) => {
    if (hour >= 0 && hour < 24) hourAgg[hour] += count;
  });
  const hourlyChart = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    count: hourAgg[hour],
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Tendinta lunara (suprapunere pe ani)" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={monthlyChart} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={X_TICK} />
            <YAxis tick={Y_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={year}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={String(year)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Sezonalitate lunara">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seasonality}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={X_TICK} />
            <YAxis tick={Y_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Distributie pe zilele saptamanii">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={weekdayChart}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="day" tick={X_TICK} />
            <YAxis tick={Y_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Distributie pe ore (24h)" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="hour" tick={X_TICK_SMALL} />
            <YAxis tick={Y_TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-tertiary)"
              fill="var(--chart-tertiary)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
