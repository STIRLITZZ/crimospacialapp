import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AreaPopup from "./AreaPopup";

const MONTHS = [
  { value: "", label: "All Months" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function MapFilters({
  crimeTypes,
  years,
  filters,
  setFilters,
  onApply,
  selectedArea,
  onClearArea,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      className={`absolute top-0 left-0 z-[1000] h-full transition-all duration-300 ${
        collapsed ? "w-10" : "w-[300px]"
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-3 -right-4 z-[1001] bg-gray-800 border border-white/10 rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!collapsed && (
        <div className="h-full bg-gray-900/95 backdrop-blur border-r border-white/10 overflow-y-auto p-4">
          <h3 className="text-white font-semibold text-sm mb-4">Map Filters</h3>

          {/* Crime Type */}
          <label className="block mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Crime Type
            </span>
            <select
              value={filters.crm_cd_desc}
              onChange={(e) => update("crm_cd_desc", e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Types</option>
              {crimeTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {/* Year */}
          <label className="block mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Year
            </span>
            <select
              value={filters.year}
              onChange={(e) => update("year", e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          {/* Month */}
          <label className="block mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Month
            </span>
            <select
              value={filters.month}
              onChange={(e) => update("month", e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {MONTHS.map((m) => (
                <option key={m.label} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {/* Hour Range */}
          <div className="mb-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
              Hour Range
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={23}
                value={filters.hour_from}
                onChange={(e) =>
                  update("hour_from", parseInt(e.target.value, 10))
                }
                className="flex-1 accent-blue-500"
              />
              <span className="text-gray-300 text-xs font-mono w-5 text-center">
                {filters.hour_from}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={0}
                max={23}
                value={filters.hour_to}
                onChange={(e) =>
                  update("hour_to", parseInt(e.target.value, 10))
                }
                className="flex-1 accent-blue-500"
              />
              <span className="text-gray-300 text-xs font-mono w-5 text-center">
                {filters.hour_to}
              </span>
            </div>
            <p className="text-gray-500 text-[10px] mt-0.5">
              {filters.hour_from}:00 – {filters.hour_to}:00
            </p>
          </div>

          {/* Weekend / Night checkboxes */}
          <div className="flex flex-col gap-2 mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.is_weekend}
                onChange={(e) => update("is_weekend", e.target.checked)}
                className="rounded bg-white/5 border-white/20 accent-blue-500"
              />
              Weekend only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.is_night}
                onChange={(e) => update("is_night", e.target.checked)}
                className="rounded bg-white/5 border-white/20 accent-blue-500"
              />
              Night only (8pm – 6am)
            </label>
          </div>

          {/* Apply button */}
          <button
            onClick={onApply}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Apply Filters
          </button>

          {/* Area Details (populated on area click) */}
          <AreaPopup area={selectedArea} onClose={onClearArea} />
        </div>
      )}
    </div>
  );
}
