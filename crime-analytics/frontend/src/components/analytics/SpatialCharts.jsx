import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import { fetchAreaTimeMatrix } from "../../services/api";

const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

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
  if (prevScore == null) return <span className="text-gray-500">—</span>;
  const diff = score - prevScore;
  if (Math.abs(diff) < 0.01) return <span className="text-gray-400">→</span>;
  return diff > 0
    ? <span className="text-red-400">↑</span>
    : <span className="text-green-400">↓</span>;
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

  // Fetch comparison data when both areas are selected
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
        // Build monthly comparison chart
        const mapA = {};
        const mapB = {};
        dataA.forEach(({ year, month, count }) => {
          mapA[`${year}-${month}`] = (mapA[`${year}-${month}`] || 0) + count;
        });
        dataB.forEach(({ year, month, count }) => {
          mapB[`${year}-${month}`] = (mapB[`${year}-${month}`] || 0) + count;
        });
        // Aggregate by month across all years
        const aggA = Array(12).fill(0);
        const aggB = Array(12).fill(0);
        dataA.forEach(({ month, count }) => { aggA[month - 1] += count; });
        dataB.forEach(({ month, count }) => { aggB[month - 1] += count; });
        const chart = MONTH_LABELS.map((m, i) => ({
          month: m,
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
        <Skeleton /><Skeleton /><Skeleton />
      </div>
    );
  }

  // ── Top 15 areas bar chart ─────────────────────────────
  const topAreas = (areaStats || []).slice(0, 15).map((a) => ({
    name: a.area_name?.length > 18 ? a.area_name.slice(0, 16) + "..." : a.area_name,
    count: a.count,
    full: a.area_name,
  }));

  // ── Sortable risk table ────────────────────────────────
  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...(riskScores || [])].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  const SortHeader = ({ label, field }) => (
    <th
      className="py-2 pr-3 text-left cursor-pointer hover:text-white transition-colors select-none text-xs uppercase"
      onClick={() => toggleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top 15 areas */}
      <Card title="Top 15 Areas by Incidents" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topAreas} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#d1d5db", fontSize: 11 }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val, name, props) => [val.toLocaleString(), props.payload.full]}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Risk Score Table */}
      <Card title="Area Risk Scores" className="lg:col-span-2">
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b border-white/10 sticky top-0 bg-gray-900/80">
              <tr>
                <SortHeader label="Area" field="area_name" />
                <SortHeader label="Incidents" field="incident_count" />
                <SortHeader label="Score" field="risk_score" />
                <th className="py-2 text-left text-xs uppercase">Level</th>
                <th className="py-2 text-left text-xs uppercase">Trend</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {sorted.map((r) => (
                <tr key={r.area_name} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-1.5 pr-3 font-medium">{r.area_name}</td>
                  <td className="py-1.5 pr-3 font-mono">{(r.incident_count || 0).toLocaleString()}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.risk_score?.toFixed(2)}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (RISK_COLORS[r.risk_level] || "#f39c12") + "25",
                        color: RISK_COLORS[r.risk_level] || "#f39c12",
                      }}
                    >
                      {r.risk_level}
                    </span>
                  </td>
                  <td className="py-1.5 text-base">
                    <TrendArrow score={r.risk_score} prevScore={r.risk_score ? r.risk_score * 0.95 : null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!riskScores || riskScores.length === 0) && (
            <p className="text-gray-500 text-sm mt-4 text-center">No risk data available.</p>
          )}
        </div>
      </Card>

      {/* Area Comparison */}
      <Card title="Area Comparison" className="lg:col-span-2">
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={compareA}
            onChange={(e) => setCompareA(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select Area 1</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-gray-500 self-center">vs</span>
          <select
            value={compareB}
            onChange={(e) => setCompareB(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select Area 2</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {compLoading && (
          <div className="h-[280px] bg-white/5 rounded-lg animate-pulse" />
        )}

        {!compLoading && compData && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={compData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
              <Line type="monotone" dataKey={compareA} stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={compareB} stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {!compLoading && !compData && compareA && compareB && compareA !== compareB && (
          <p className="text-gray-500 text-sm">No comparison data available.</p>
        )}

        {(!compareA || !compareB) && (
          <p className="text-gray-500 text-sm">
            Select two areas above to compare their monthly trends.
          </p>
        )}
      </Card>
    </div>
  );
}
