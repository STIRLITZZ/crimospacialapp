import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  BarChart3,
  BrainCircuit,
  MoonStar,
  SunMedium,
} from "lucide-react";
import { useFilters } from "./context/FilterContext";
import { useEtlStatus } from "./context/EtlStatusContext";
import { useTheme } from "./context/ThemeContext";
import { translateCrimeTypeBilingual } from "./lib/translations";

import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import Analytics from "./pages/Analytics";
import Predict from "./pages/Predict";
import { DataImportBanner } from "./components/DataImportState";

const NAV_ITEMS = [
  { to: "/", label: "Panou", icon: LayoutDashboard },
  { to: "/map", label: "Harta", icon: Map },
  { to: "/analytics", label: "Analiza", icon: BarChart3 },
  { to: "/predict", label: "Predictii", icon: BrainCircuit },
];

function Sidebar() {
  const {
    selectedArea,
    setSelectedArea,
    selectedCrimeType,
    setSelectedCrimeType,
    yearRange,
    setYearRange,
    areas,
    crimeTypes,
    dateRange,
  } = useFilters();
  const { toggleTheme, isDark } = useTheme();

  return (
    <aside className="app-sidebar w-64 bg-dark-900 text-white flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-5 border-b border-white/10 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">
            Inteligenta infractionala
          </p>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-white">
            Analiza Infractiunilor
          </h1>
        </div>

        <button
          onClick={toggleTheme}
          className="theme-switch theme-switch--compact"
          aria-label={isDark ? "Comuta pe tema luminoasa" : "Comuta pe tema intunecata"}
          title={isDark ? "Comuta pe tema luminoasa" : "Comuta pe tema intunecata"}
        >
          <span className="theme-switch__icon">
            {isDark ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary-700 text-white"
                  : "text-gray-300 hover:bg-white/5"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Global Filters */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Filtre
        </p>

        {/* Area */}
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">Toate zonele</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* Crime Type */}
        <select
          value={selectedCrimeType}
          onChange={(e) => setSelectedCrimeType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">Toate tipurile de infractiuni</option>
          {crimeTypes.map((c) => (
            <option key={c} value={c}>
              {translateCrimeTypeBilingual(c)}
            </option>
          ))}
        </select>

        {/* Year Range */}
        <div className="flex gap-2">
          <select
            value={yearRange.from || ""}
            onChange={(e) =>
              setYearRange((prev) => ({
                ...prev,
                from: Number(e.target.value) || null,
              }))
            }
            className="w-1/2 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none"
          >
            <option value="">De la</option>
            {dateRange.min &&
              dateRange.max &&
              Array.from(
                { length: dateRange.max - dateRange.min + 1 },
                (_, i) => dateRange.min + i
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
          <select
            value={yearRange.to || ""}
            onChange={(e) =>
              setYearRange((prev) => ({
                ...prev,
                to: Number(e.target.value) || null,
              }))
            }
            className="w-1/2 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none"
          >
            <option value="">Pana la</option>
            {dateRange.min &&
              dateRange.max &&
              Array.from(
                { length: dateRange.max - dateRange.min + 1 },
                (_, i) => dateRange.min + i
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const { statusInfo, isChecking } = useEtlStatus();

  return (
    <BrowserRouter>
      <div className="app-shell flex min-h-screen bg-dark-800">
        <Sidebar />
        <main className="app-main ml-64 flex-1 p-6">
          <DataImportBanner statusInfo={statusInfo} isChecking={isChecking} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/predict" element={<Predict />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
