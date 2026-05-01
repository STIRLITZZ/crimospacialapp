import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(var(--shadow-rgb), 0.16)",
};

const COLORS = [
  "var(--chart-primary)", "var(--chart-secondary)", "#93c5fd", "#bfdbfe",
  "#a5b4fc", "#818cf8", "#6366f1", "#c4b5fd",
  "#d8b4fe", "#e9d5ff", "#f0abfc", "#f5d0fe",
];

export default function FeatureImportanceChart({ importances, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-3 w-48 bg-white/10 rounded mb-4" />
        <div className="h-[280px] bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (!importances || importances.length === 0) {
    return <p className="text-gray-500 text-sm">Nu exista date despre importanta variabilelor.</p>;
  }

  const data = importances
    .filter((f) => f.importance > 0)
    .slice(0, 12)
    .map((f) => ({
      name: f.feature,
      importance: parseFloat((f.importance * 100).toFixed(2)),
    }));

  return (
    <div>
      <p className="text-gray-400 text-xs uppercase mb-3">
        Importanta variabilelor
      </p>
      <ResponsiveContainer width="100%" height={data.length * 32 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 5, right: 20 }}
        >
          <XAxis
            type="number"
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
            domain={[0, "auto"]}
            unit="%"
          />
          <YAxis
            dataKey="name"
            type="category"
            width={90}
            tick={{ fill: "var(--text-soft)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val) => [`${val}%`, "Importanta"]}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
