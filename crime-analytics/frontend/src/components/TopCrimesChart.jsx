import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const BAR_COLOR = "#3b82f6";

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
    name: d.crm_cd_desc?.length > 22 ? d.crm_cd_desc.slice(0, 20) + "..." : d.crm_cd_desc,
    count: d.count,
    full: d.crm_cd_desc,
  }));

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px]">
      <h3 className="text-white font-semibold mb-3">Top Crime Types</h3>
      {chartData.length === 0 ? (
        <p className="text-gray-500 text-sm">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={310}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis
              dataKey="name"
              type="category"
              width={130}
              tick={{ fill: "#d1d5db", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 12,
              }}
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
