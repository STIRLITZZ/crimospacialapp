const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function intensityColor(value, max) {
  if (!max || value === 0) return "rgba(255,255,255,0.03)";
  const ratio = value / max;
  // Blue-to-red gradient
  if (ratio < 0.25) return `rgba(59,130,246,${0.15 + ratio * 2})`;
  if (ratio < 0.5) return `rgba(245,158,11,${0.3 + ratio})`;
  if (ratio < 0.75) return `rgba(234,88,12,${0.4 + ratio * 0.5})`;
  return `rgba(239,68,68,${0.5 + ratio * 0.4})`;
}

export default function HourlyHeatmap({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
        <div className="h-3 w-44 bg-white/10 rounded mb-4" />
        <div className="h-48 bg-white/5 rounded-lg" />
      </div>
    );
  }

  // data is an array of {hour, weekday, count} or flat {hour, count}
  // Build a 7×24 matrix. If weekday data isn't available, replicate hourly across all days.
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">
          Hourly Distribution Heatmap
        </h3>
        <p className="text-gray-500 text-sm">No hourly data available.</p>
      </div>
    );
  }

  // If data has weekday field, use it; otherwise spread across all days
  const hasWeekday = data[0]?.weekday !== undefined;
  if (hasWeekday) {
    data.forEach(({ hour, weekday, count }) => {
      const d = typeof weekday === "number" ? weekday : 0;
      if (d >= 0 && d < 7 && hour >= 0 && hour < 24) {
        matrix[d][hour] = count;
        if (count > max) max = count;
      }
    });
  } else {
    data.forEach(({ hour, count }) => {
      if (hour >= 0 && hour < 24) {
        for (let d = 0; d < 7; d++) {
          matrix[d][hour] = count;
        }
        if (count > max) max = count;
      }
    });
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-3">
        Hourly Distribution Heatmap
      </h3>
      <div className="overflow-x-auto">
        {/* Hour labels */}
        <div className="flex mb-1 ml-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-gray-500 min-w-[28px]"
            >
              {h}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        {DAYS.map((day, di) => (
          <div key={day} className="flex items-center gap-0 mb-0.5">
            <span className="w-10 text-xs text-gray-400 text-right pr-2 shrink-0">
              {day}
            </span>
            {matrix[di].map((val, hi) => (
              <div
                key={hi}
                className="flex-1 min-w-[28px] h-7 rounded-sm cursor-default transition-colors"
                style={{ backgroundColor: intensityColor(val, max) }}
                title={`${day} ${hi}:00 — ${val.toLocaleString()} incidents`}
              />
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-gray-500">
          <span>Low</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.75, 1.0].map((r) => (
              <div
                key={r}
                className="w-6 h-3 rounded-sm"
                style={{ backgroundColor: intensityColor(r * max, max) }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
