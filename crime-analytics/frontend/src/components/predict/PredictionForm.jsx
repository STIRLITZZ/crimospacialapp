import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useTheme } from "../../context/ThemeContext";

const AREA_MAP = {
  1: "Central",
  2: "Rampart",
  3: "Southwest",
  4: "Hollenbeck",
  5: "Harbor",
  6: "Hollywood",
  7: "Wilshire",
  8: "West LA",
  9: "Van Nuys",
  10: "West Valley",
  11: "Northeast",
  12: "77th Street",
  13: "Newton",
  14: "Pacific",
  15: "N Hollywood",
  16: "Foothill",
  17: "Devonshire",
  18: "Southeast",
  19: "Mission",
  20: "Olympic",
  21: "Topanga",
};

function LocationPicker({ lat, lon, onLocationChange, tileUrl }) {
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        onLocationChange(
          parseFloat(e.latlng.lat.toFixed(6)),
          parseFloat(e.latlng.lng.toFixed(6))
        );
      },
    });
    return null;
  }

  return (
    <div className="h-[180px] rounded-lg overflow-hidden border border-white/10">
      <MapContainer
        center={[lat, lon]}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer attribution="&copy; OSM" url={tileUrl} />
        <Marker position={[lat, lon]} />
        <MapClickHandler />
      </MapContainer>
    </div>
  );
}

export default function PredictionForm({ onPredict, loading }) {
  const { isDark } = useTheme();
  const now = new Date();
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    area: 1,
    vict_age: 30,
    vict_sex: 2,
    lat: 34.05,
    lon: -118.25,
    quarter: Math.ceil((now.getMonth() + 1) / 3),
    rpt_dist_no: 100,
    vict_descent: 0,
    premis_cd: 101,
    weapon_used_cd: 400,
  });

  const computed = useMemo(() => {
    const date = new Date(form.year, form.month - 1, form.day);
    const dayOfWeek = date.getDay();
    return {
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      is_night: form.hour >= 20 || form.hour < 6,
      quarter: Math.ceil(form.month / 3),
    };
  }, [form.year, form.month, form.day, form.hour]);

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict({
      ...form,
      quarter: computed.quarter,
      is_weekend: computed.is_weekend,
      is_night: computed.is_night,
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Predictie individuala</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
            Locatie (apasa pe harta pentru setare)
          </label>
          <LocationPicker
            lat={form.lat}
            lon={form.lon}
            tileUrl={tileUrl}
            onLocationChange={(lat, lon) => {
              update("lat", lat);
              update("lon", lon);
            }}
          />
          <div className="flex gap-3 mt-2">
            <div className="flex-1">
              <span className="text-gray-500 text-[10px]">Lat</span>
              <input
                type="number"
                step="0.001"
                value={form.lat}
                onChange={(e) => update("lat", parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <span className="text-gray-500 text-[10px]">Lon</span>
              <input
                type="number"
                step="0.001"
                value={form.lon}
                onChange={(e) => update("lon", parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Zona LAPD
            </span>
            <select
              value={form.area}
              onChange={(e) => update("area", parseInt(e.target.value, 10))}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {Object.entries(AREA_MAP).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} - {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Rpt Dist No
            </span>
            <input
              type="number"
              min={0}
              value={form.rpt_dist_no}
              onChange={(e) => update("rpt_dist_no", parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              An
            </span>
            <input
              type="number"
              min={2020}
              max={2030}
              value={form.year}
              onChange={(e) => update("year", parseInt(e.target.value, 10))}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Luna
            </span>
            <select
              value={form.month}
              onChange={(e) => update("month", parseInt(e.target.value, 10))}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Zi
            </span>
            <input
              type="number"
              min={1}
              max={31}
              value={form.day}
              onChange={(e) => update("day", parseInt(e.target.value, 10))}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-gray-400 text-xs uppercase tracking-wider">
            Ora: {form.hour}:00
          </span>
          <input
            type="range"
            min={0}
            max={23}
            value={form.hour}
            onChange={(e) => update("hour", parseInt(e.target.value, 10))}
            className="mt-1 w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Varsta victima
            </span>
            <input
              type="number"
              min={0}
              max={120}
              value={form.vict_age}
              onChange={(e) => update("vict_age", parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Sex victima (cod)
            </span>
            <input
              type="number"
              min={0}
              value={form.vict_sex}
              onChange={(e) => update("vict_sex", parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Origine victima
            </span>
            <input
              type="number"
              min={0}
              value={form.vict_descent}
              onChange={(e) => update("vict_descent", parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Cod locatie
            </span>
            <input
              type="number"
              min={0}
              value={form.premis_cd}
              onChange={(e) => update("premis_cd", parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Cod arma folosita
            </span>
            <input
              type="number"
              min={0}
              value={form.weapon_used_cd}
              onChange={(e) =>
                update("weapon_used_cd", parseInt(e.target.value, 10) || 0)
              }
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              computed.is_weekend
                ? "bg-blue-500/20 text-blue-300"
                : "bg-white/5 text-gray-500"
            }`}
          >
            {computed.is_weekend ? "Weekend" : "Zi lucratoare"}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              computed.is_night
                ? "bg-indigo-500/20 text-indigo-300"
                : "bg-white/5 text-gray-500"
            }`}
          >
            {computed.is_night ? "Noapte" : "Zi"}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-500">
            Q{computed.quarter}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Se calculeaza...
            </span>
          ) : (
            "Prezice tipul de infractiune"
          )}
        </button>
      </form>
    </div>
  );
}
