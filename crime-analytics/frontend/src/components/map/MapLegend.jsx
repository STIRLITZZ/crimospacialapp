const LEVELS = [
  { label: "Very Low", color: "#2ecc71" },
  { label: "Low", color: "#27ae60" },
  { label: "Medium", color: "#f39c12" },
  { label: "High", color: "#e67e22" },
  { label: "Very High", color: "#e74c3c" },
];

export default function MapLegend() {
  return (
    <div className="absolute bottom-6 left-6 z-[1000] bg-gray-900/90 backdrop-blur border border-white/10 rounded-lg p-3 text-xs">
      <p className="text-white font-semibold mb-2">Risk Level</p>
      {LEVELS.map((l) => (
        <div key={l.label} className="flex items-center gap-2 mb-1 last:mb-0">
          <div
            className="w-4 h-3 rounded-sm"
            style={{ backgroundColor: l.color }}
          />
          <span className="text-gray-300">{l.label}</span>
        </div>
      ))}
    </div>
  );
}
