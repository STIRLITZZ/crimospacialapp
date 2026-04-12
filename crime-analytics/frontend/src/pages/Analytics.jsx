import { useEffect, useState } from "react";
import { useFilters } from "../context/FilterContext";
import { fetchTimeSeries, fetchHourlyDistribution } from "../services/api";

export default function Analytics() {
  const { buildFilterParams } = useFilters();
  const [timeSeries, setTimeSeries] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = buildFilterParams();
    setLoading(true);
    Promise.all([
      fetchTimeSeries(params).catch(() => []),
      fetchHourlyDistribution(params).catch(() => []),
    ])
      .then(([ts, hr]) => {
        setTimeSeries(ts);
        setHourly(hr);
      })
      .finally(() => setLoading(false));
  }, [buildFilterParams]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center mt-20">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Analytics</h2>

      {/* Time Series */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">
          Monthly Crime Trend
        </h3>
        {timeSeries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/10">
                  <th className="py-2 pr-4">Year</th>
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {timeSeries.slice(0, 24).map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1.5 pr-4">{row.year}</td>
                    <td className="py-1.5 pr-4">{row.month}</td>
                    <td className="py-1.5 font-mono">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No time series data available.</p>
        )}
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">
          Hourly Distribution
        </h3>
        {hourly.length > 0 ? (
          <div className="flex items-end gap-1 h-40">
            {hourly.map((h) => {
              const max = Math.max(...hourly.map((x) => x.count));
              const pct = max > 0 ? (h.count / max) * 100 : 0;
              return (
                <div
                  key={h.hour}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-primary-500 rounded-t"
                    style={{ height: `${pct}%` }}
                    title={`Hour ${h.hour}: ${h.count}`}
                  />
                  <span className="text-xs text-gray-500 mt-1">
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No hourly data available.</p>
        )}
      </div>
    </div>
  );
}
