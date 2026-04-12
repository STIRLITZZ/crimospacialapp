import { useEffect, useState } from "react";
import { useFilters } from "../context/FilterContext";
import { fetchDashboard } from "../services/api";

export default function Dashboard() {
  const { buildFilterParams } = useFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboard(buildFilterParams())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [buildFilterParams]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center mt-20">
        Loading dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-gray-400 text-center mt-20">
        Unable to load dashboard data. Make sure the backend services are running.
      </div>
    );
  }

  const { summary, areas_stats, crime_type_distribution, risk_scores } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Incidents" value={summary?.total_incidents ?? 0} />
        <SummaryCard label="Date Range" value={summary?.date_range || "N/A"} small />
        <SummaryCard label="Highest Risk Area" value={summary?.highest_risk_area || "N/A"} />
        <SummaryCard label="Most Common Crime" value={summary?.most_common_crime || "N/A"} small />
      </div>

      {/* Top areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Areas by Incidents">
          <ul className="space-y-2 text-sm text-gray-300">
            {(areas_stats || []).slice(0, 10).map((a) => (
              <li key={a.area_name} className="flex justify-between">
                <span>{a.area_name}</span>
                <span className="font-mono">{a.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top Crime Types">
          <ul className="space-y-2 text-sm text-gray-300">
            {(crime_type_distribution || []).slice(0, 10).map((c) => (
              <li key={c.crm_cd_desc} className="flex justify-between">
                <span className="truncate mr-4">{c.crm_cd_desc}</span>
                <span className="font-mono">{c.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Risk scores */}
      {risk_scores && risk_scores.length > 0 && (
        <Card title="Area Risk Scores">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {risk_scores.map((r) => (
              <div
                key={r.area_name}
                className="rounded-lg p-3 text-sm"
                style={{ backgroundColor: riskColor(r.risk_level) + "22" }}
              >
                <p className="font-semibold text-white">{r.area_name}</p>
                <p style={{ color: riskColor(r.risk_level) }}>
                  {r.risk_level} ({r.risk_score.toFixed(2)})
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, small }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-white font-semibold mt-1 ${small ? "text-sm" : "text-2xl"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function riskColor(level) {
  const map = {
    very_low: "#2ecc71",
    low: "#27ae60",
    medium: "#f39c12",
    high: "#e67e22",
    very_high: "#e74c3c",
  };
  return map[level] || "#f39c12";
}
