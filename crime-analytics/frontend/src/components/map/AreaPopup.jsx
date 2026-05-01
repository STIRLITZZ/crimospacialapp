import {
  translateCrimeType,
  translateRiskLevel,
} from "../../lib/translations";

const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

export default function AreaPopup({ area, onClose }) {
  if (!area) return null;

  return (
    <div className="border-t border-white/10 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-semibold text-sm">Detalii zona</h4>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-xs px-1"
        >
          x
        </button>
      </div>

      <p className="text-white font-medium mb-2">{area.area_name}</p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <span className="text-gray-500">Incidente</span>
        <span className="text-gray-200 font-mono">
          {(area.incident_count || 0).toLocaleString()}
        </span>

        <span className="text-gray-500">Scor de risc</span>
        <span className="text-gray-200 font-mono">
          {area.risk_score?.toFixed(2) ?? "N/A"}
        </span>

        <span className="text-gray-500">Rata infractiunilor</span>
        <span className="text-gray-200 font-mono">
          {(area.crime_rate || 0).toLocaleString()}
        </span>

        <span className="text-gray-500">Nivel de risc</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
          style={{
            backgroundColor: (RISK_COLORS[area.risk_level] || "#f39c12") + "25",
            color: RISK_COLORS[area.risk_level] || "#f39c12",
          }}
        >
          {translateRiskLevel(area.risk_level)}
        </span>
      </div>

      {area.top_crimes && area.top_crimes.length > 0 && (
        <div className="mt-3">
          <p className="text-gray-500 text-xs mb-1.5">Top tipuri de infractiuni</p>
          {area.top_crimes.map((crime) => (
            <div
              key={crime.type}
              className="flex items-center justify-between text-xs mb-1"
            >
              <span className="text-gray-300 truncate mr-2">
                {translateCrimeType(crime.type)}
              </span>
              <span className="text-gray-400 font-mono shrink-0">
                {crime.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
