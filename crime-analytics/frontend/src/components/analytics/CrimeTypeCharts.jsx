import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { translateCrimeType } from "../../lib/translations";

const COLORS = [
  "var(--chart-primary)",
  "var(--chart-secondary)",
  "var(--chart-tertiary)",
  "var(--chart-danger)",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#6366f1",
  "#e11d48",
  "#0ea5e9",
  "#84cc16",
  "#d946ef",
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
const X_TICK = { fill: "var(--chart-axis)", fontSize: 11 };
const X_TICK_SMALL = { fill: "var(--chart-axis)", fontSize: 10 };
const Y_TICK_SMALL = { fill: "var(--text-soft)", fontSize: 10 };
const LEGEND_STYLE = { fontSize: 10, color: "var(--text-soft)" };

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
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const allTypes = crimeTypes || [];
  const top10 = allTypes.slice(0, 10);
  const otherCount = allTypes.slice(10).reduce((sum, item) => sum + item.count, 0);
  const donutData = [
    ...top10.map((item) => ({
      name: translateCrimeType(item.crm_cd_desc),
      value: item.count,
    })),
    ...(otherCount > 0 ? [{ name: "Altele", value: otherCount }] : []),
  ];
  const totalCount = donutData.reduce((sum, item) => sum + item.value, 0);

  const topTypes = allTypes
    .slice(0, 5)
    .map((item) => translateCrimeType(item.crm_cd_desc));

  const topAreasForStacked = (areaStats || []).slice(0, 8).map((area) => {
    const row = {
      area:
        area.area_name?.length > 14
          ? area.area_name.slice(0, 12) + "..."
          : area.area_name,
    };

    const totalCrime = allTypes.reduce((sum, item) => sum + item.count, 0) || 1;
    topTypes.forEach((crimeType) => {
      const typeEntry = allTypes.find(
        (item) => translateCrimeType(item.crm_cd_desc) === crimeType
      );
      const ratio = typeEntry ? typeEntry.count / totalCrime : 0;
      row[crimeType] = Math.round(area.count * ratio);
    });
    return row;
  });

  const fullBreakdown = allTypes.slice(0, 25).map((item) => ({
    name:
      translateCrimeType(item.crm_cd_desc)?.length > 28
        ? translateCrimeType(item.crm_cd_desc).slice(0, 26) + "..."
        : translateCrimeType(item.crm_cd_desc),
    count: item.count,
    full: translateCrimeType(item.crm_cd_desc),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Distributia infractiunilor">
        {donutData.length === 0 ? (
          <p className="text-gray-500 text-sm">Nu exista date disponibile.</p>
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
                  `${name.length > 15 ? name.slice(0, 13) + "..." : name} ${(
                    percent * 100
                  ).toFixed(0)}%`
                }
                labelLine={{ stroke: "var(--chart-axis)" }}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val) => [val.toLocaleString(), "Incidente"]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className="text-gray-500 text-xs text-center mt-1">
          Total: {totalCount.toLocaleString()} incidente
        </p>
      </Card>

      <Card title="Top tipuri de infractiuni pe zone">
        {topAreasForStacked.length === 0 ? (
          <p className="text-gray-500 text-sm">Nu exista date disponibile.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topAreasForStacked} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="area"
                tick={X_TICK_SMALL}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={X_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              {topTypes.map((crimeType, i) => (
                <Bar
                  key={crimeType}
                  dataKey={crimeType}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                  name={
                    crimeType.length > 20
                      ? crimeType.slice(0, 18) + "..."
                      : crimeType
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card
        title="Distribuire completa a tipurilor de infractiuni"
        className="lg:col-span-2"
      >
        {fullBreakdown.length === 0 ? (
          <p className="text-gray-500 text-sm">Nu exista date disponibile.</p>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(400, fullBreakdown.length * 22)}
          >
            <BarChart
              data={fullBreakdown}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis type="number" tick={X_TICK} />
              <YAxis
                dataKey="name"
                type="category"
                width={180}
                tick={Y_TICK_SMALL}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val, name, props) => [
                  val.toLocaleString(),
                  props.payload.full,
                ]}
              />
              <Bar dataKey="count" fill="var(--chart-secondary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
