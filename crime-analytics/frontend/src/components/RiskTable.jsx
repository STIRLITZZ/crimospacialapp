import { useState } from "react";

const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

export default function RiskTable({ scores, loading }) {
  const [sortKey, setSortKey] = useState("risk_score");
  const [sortAsc, setSortAsc] = useState(false);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px] animate-pulse">
        <div className="h-3 w-28 bg-white/10 rounded mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 bg-white/5 rounded mb-2" />
        ))}
      </div>
    );
  }

  const sorted = [...(scores || [])].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortAsc ? va - vb : vb - va;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ label, field }) => (
    <th
      className="py-2 pr-3 text-left cursor-pointer hover:text-white transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px] flex flex-col">
      <h3 className="text-white font-semibold mb-3">Risk Scores</h3>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase border-b border-white/10 sticky top-0 bg-dark-900/80">
            <tr>
              <SortHeader label="Area" field="area_name" />
              <SortHeader label="Incidents" field="incident_count" />
              <SortHeader label="Score" field="risk_score" />
              <th className="py-2 text-left">Level</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {sorted.map((r) => (
              <tr
                key={r.area_name}
                className="border-b border-white/5 hover:bg-white/5"
              >
                <td className="py-1.5 pr-3 font-medium">{r.area_name}</td>
                <td className="py-1.5 pr-3 font-mono">
                  {(r.incident_count || 0).toLocaleString()}
                </td>
                <td className="py-1.5 pr-3 font-mono">
                  {r.risk_score?.toFixed(2)}
                </td>
                <td className="py-1.5">
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
              </tr>
            ))}
          </tbody>
        </table>
        {(!scores || scores.length === 0) && (
          <p className="text-gray-500 text-sm mt-4 text-center">No data</p>
        )}
      </div>
    </div>
  );
}
