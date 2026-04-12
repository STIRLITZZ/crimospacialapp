import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#3b82f6","#f59e0b","#10b981","#ef4444","#8b5cf6",
  "#ec4899","#06b6d4","#f97316","#14b8a6","#a855f7",
  "#6366f1","#e11d48","#0ea5e9","#84cc16","#d946ef",
];

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

export default function CrimeTypeCharts({
  crimeTypes,
  areaStats,
  loading,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton /><Skeleton /><Skeleton />
      </div>
    );
  }

  const allTypes = crimeTypes || [];

  // ── Donut chart: top 10 + "Other" ─────────────────────
  const top10 = allTypes.slice(0, 10);
  const otherCount = allTypes.slice(10).reduce((s, c) => s + c.count, 0);
  const donutData = [
    ...top10.map((c) => ({ name: c.crm_cd_desc, value: c.count })),
    ...(otherCount > 0 ? [{ name: "Other", value: otherCount }] : []),
  ];
  const totalCount = donutData.reduce((s, d) => s + d.value, 0);

  // ── Stacked bar: top 5 types across top areas ──────────
  // We don't have per-area crime type breakdown from a single call,
  // so we show the top 5 types proportionally against area counts.
  const topTypes = allTypes.slice(0, 5).map((c) => c.crm_cd_desc);
  const topAreasForStacked = (areaStats || []).slice(0, 8).map((a) => {
    const row = { area: a.area_name?.length > 14 ? a.area_name.slice(0, 12) + "..." : a.area_name };
    // Distribute the area count proportionally across top crime types
    const totalCrime = allTypes.reduce((s, c) => s + c.count, 0) || 1;
    topTypes.forEach((t) => {
      const typeEntry = allTypes.find((c) => c.crm_cd_desc === t);
      const ratio = typeEntry ? typeEntry.count / totalCrime : 0;
      row[t] = Math.round(a.count * ratio);
    });
    return row;
  });

  // ── Full breakdown bar chart ───────────────────────────
  const fullBreakdown = allTypes.slice(0, 25).map((c) => ({
    name: c.crm_cd_desc?.length > 28 ? c.crm_cd_desc.slice(0, 26) + "..." : c.crm_cd_desc,
    count: c.count,
    full: c.crm_cd_desc,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Donut Chart */}
      <Card title="Crime Distribution">
        {donutData.length === 0 ? (
          <p className="text-gray-500 text-sm">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name.length > 15 ? name.slice(0, 13) + "…" : name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#6b7280" }}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val) => [val.toLocaleString(), "Incidents"]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className="text-gray-500 text-xs text-center mt-1">
          Total: {totalCount.toLocaleString()} incidents
        </p>
      </Card>

      {/* Stacked Bar: Top 5 types across areas */}
      <Card title="Top Crime Types by Area">
        {topAreasForStacked.length === 0 ? (
          <p className="text-gray-500 text-sm">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topAreasForStacked} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="area" tick={{ fill: "#9ca3af", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10, color: "#d1d5db" }} />
              {topTypes.map((t, i) => (
                <Bar
                  key={t}
                  dataKey={t}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                  name={t.length > 20 ? t.slice(0, 18) + "…" : t}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Full breakdown */}
      <Card title="All Crime Types Breakdown" className="lg:col-span-2">
        {fullBreakdown.length === 0 ? (
          <p className="text-gray-500 text-sm">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(400, fullBreakdown.length * 22)}>
            <BarChart data={fullBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fill: "#d1d5db", fontSize: 10 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val, name, props) => [val.toLocaleString(), props.payload.full]}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
