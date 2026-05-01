import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { translateCrimeType } from "../lib/translations";

const BAR_COLOR = "var(--chart-primary)";
const X_TICK = { fill: "var(--chart-axis)", fontSize: 11 };
const Y_TICK = { fill: "var(--text-soft)", fontSize: 11 };
const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(var(--shadow-rgb), 0.16)",
};

export default function TopCrimesChart({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px] animate-pulse">
        <div className="h-3 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 bg-white/5 rounded" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const chartData = (data || []).slice(0, 10).map((d) => ({
    name:
      translateCrimeType(d.crm_cd_desc)?.length > 22
        ? translateCrimeType(d.crm_cd_desc).slice(0, 20) + "..."
        : translateCrimeType(d.crm_cd_desc),
    count: d.count,
    full: translateCrimeType(d.crm_cd_desc),
  }));

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px]">
      <h3 className="text-white font-semibold mb-3">Top tipuri de infractiuni</h3>
      {chartData.length === 0 ? (
        <p className="text-gray-500 text-sm">Nu exista date disponibile.</p>
      ) : (
        <ResponsiveContainer width="100%" height={310}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={X_TICK} />
            <YAxis
              dataKey="name"
              type="category"
              width={130}
              tick={Y_TICK}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name, props) => [
                value.toLocaleString(),
                props.payload.full,
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLOR} fillOpacity={1 - i * 0.07} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
