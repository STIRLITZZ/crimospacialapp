import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

const COLORS = [
  "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
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
    return <p className="text-gray-500 text-sm">No feature importance data.</p>;
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
        Feature Importances
      </p>
      <ResponsiveContainer width="100%" height={data.length * 32 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 5, right: 20 }}
        >
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            domain={[0, "auto"]}
            unit="%"
          />
          <YAxis
            dataKey="name"
            type="category"
            width={90}
            tick={{ fill: "#d1d5db", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val) => [`${val}%`, "Importance"]}
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
