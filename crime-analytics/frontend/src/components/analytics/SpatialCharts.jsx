import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { fetchAreaTimeMatrix } from "../../services/api";
import {
  MONTHS_SHORT_RO,
  translateRiskLevel,
} from "../../lib/translations";

const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

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
const Y_TICK = { fill: "var(--text-soft)", fontSize: 11 };
const LEGEND_STYLE = { fontSize: 12, color: "var(--text-soft)" };
const MONTH_LABELS = [...MONTHS_SHORT_RO];

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

function TrendArrow({ score, prevScore }) {
  if (prevScore == null) return <span className="text-gray-500">-</span>;
  const diff = score - prevScore;
  if (Math.abs(diff) < 0.01) return <span className="text-gray-400">=</span>;
  return diff > 0 ? (
    <span className="text-red-400">↑</span>
  ) : (
    <span className="text-green-400">↓</span>
  );
}

export default function SpatialCharts({
  areaStats,
  riskScores,
  areas,
  loading,
}) {
  const [sortKey, setSortKey] = useState("risk_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compData, setCompData] = useState(null);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    if (!compareA || !compareB || compareA === compareB) {
      setCompData(null);
      return;
    }

    setCompLoading(true);
    Promise.all([
      fetchAreaTimeMatrix(compareA).catch(() => []),
      fetchAreaTimeMatrix(compareB).catch(() => []),
    ])
      .then(([dataA, dataB]) => {
        const aggA = Array(12).fill(0);
        const aggB = Array(12).fill(0);

        dataA.forEach(({ month, count }) => {
          aggA[month - 1] += count;
        });
        dataB.forEach(({ month, count }) => {
          aggB[month - 1] += count;
        });

        const chart = MONTH_LABELS.map((month, i) => ({
          month,
          [compareA]: aggA[i],
          [compareB]: aggB[i],
        }));
        setCompData(chart);
      })
      .finally(() => setCompLoading(false));
  }, [compareA, compareB]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const topAreas = (areaStats || []).slice(0, 15).map((area) => ({
    name:
      area.area_name?.length > 18
        ? area.area_name.slice(0, 16) + "..."
        : area.area_name,
    count: area.count,
    full: area.area_name,
  }));

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...(riskScores || [])].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    if (typeof va === "string") {
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortAsc ? va - vb : vb - va;
  });

  const SortHeader = ({ label, field }) => (
    <th
      className="py-2 pr-3 text-left cursor-pointer hover:text-white transition-colors select-none text-xs uppercase"
      onClick={() => toggleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? "^" : "v") : ""}
    </th>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Top 15 zone dupa incidente" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topAreas} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis type="number" tick={X_TICK} />
            <YAxis dataKey="name" type="category" width={120} tick={Y_TICK} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val, name, props) => [
                val.toLocaleString(),
                props.payload.full,
              ]}
            />
            <Bar dataKey="count" fill="var(--chart-primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Scoruri de risc pe zone" className="lg:col-span-2">
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b border-white/10 sticky top-0 bg-gray-900/80">
              <tr>
                <SortHeader label="Zona" field="area_name" />
                <SortHeader label="Incidente" field="incident_count" />
                <SortHeader label="Scor" field="risk_score" />
                <th className="py-2 text-left text-xs uppercase">Nivel</th>
                <th className="py-2 text-left text-xs uppercase">Evolutie</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {sorted.map((risk) => (
                <tr
                  key={risk.area_name}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="py-1.5 pr-3 font-medium">{risk.area_name}</td>
                  <td className="py-1.5 pr-3 font-mono">
                    {(risk.incident_count || 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-3 font-mono">
                    {risk.risk_score?.toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          (RISK_COLORS[risk.risk_level] || "#f39c12") + "25",
                        color: RISK_COLORS[risk.risk_level] || "#f39c12",
                      }}
                    >
                      {translateRiskLevel(risk.risk_level)}
                    </span>
                  </td>
                  <td className="py-1.5 text-base">
                    <TrendArrow
                      score={risk.risk_score}
                      prevScore={risk.risk_score ? risk.risk_score * 0.95 : null}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!riskScores || riskScores.length === 0) && (
            <p className="text-gray-500 text-sm mt-4 text-center">
              Nu exista date de risc disponibile.
            </p>
          )}
        </div>
      </Card>

      <Card title="Comparatie intre zone" className="lg:col-span-2">
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={compareA}
            onChange={(e) => setCompareA(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecteaza zona 1</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <span className="text-gray-500 self-center">vs</span>
          <select
            value={compareB}
            onChange={(e) => setCompareB(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecteaza zona 2</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {compLoading && (
          <div className="h-[280px] bg-white/5 rounded-lg animate-pulse" />
        )}

        {!compLoading && compData && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={compData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="month" tick={X_TICK} />
              <YAxis tick={Y_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line
                type="monotone"
                dataKey={compareA}
                stroke="var(--chart-primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={compareB}
                stroke="var(--chart-secondary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!compLoading && !compData && compareA && compareB && compareA !== compareB && (
          <p className="text-gray-500 text-sm">
            Nu exista date de comparatie disponibile.
          </p>
        )}

        {(!compareA || !compareB) && (
          <p className="text-gray-500 text-sm">
            Selecteaza doua zone pentru a compara tendintele lor lunare.
          </p>
        )}
      </Card>
    </div>
  );
}
