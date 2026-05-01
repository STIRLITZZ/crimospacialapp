import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { useFilters } from "../context/FilterContext";
import { useTheme } from "../context/ThemeContext";
import { translateRiskLevel } from "../lib/translations";

const LA_CENTER = [34.05, -118.25];
const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

export default function MiniMap({ geojson, loading }) {
  const navigate = useNavigate();
  const { setSelectedArea } = useFilters();
  const { isDark } = useTheme();
  const layerKey = useMemo(
    () =>
      geojson?.features?.length
        ? geojson.features
            .map((feature) => {
              const props = feature.properties || {};
              return [
                props.area_name || "",
                props.incident_count || 0,
                props.risk_level || "",
                props.risk_score || 0,
              ].join("|");
            })
            .join(";")
        : "empty",
    [geojson]
  );
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[380px] animate-pulse">
        <div className="h-3 w-24 bg-white/10 rounded mb-3" />
        <div className="h-full bg-white/5 rounded-lg" />
      </div>
    );
  }

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    layer.bindTooltip(
      `<strong>${props.area_name}</strong><br/>` +
        `Incidente: ${props.incident_count || 0}<br/>` +
        `Risc: ${translateRiskLevel(props.risk_level) || "N/A"}`,
      { sticky: true }
    );
    layer.on("click", () => {
      setSelectedArea(props.area_name || "");
      navigate("/map");
    });
  };

  const style = (feature) => {
    const level = feature.properties?.risk_level || "medium";
    return {
      fillColor: RISK_COLORS[level] || "#f39c12",
      weight: 1.5,
      opacity: 0.8,
      color: "var(--map-stroke)",
      fillOpacity: 0.55,
    };
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-3">Harta riscului pe zone</h3>
      <div className="h-[320px] rounded-lg overflow-hidden">
        <MapContainer
          center={LA_CENTER}
          zoom={10}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url={tileUrl}
          />
          {geojson && geojson.features?.length > 0 && (
            <GeoJSON
              key={layerKey}
              data={geojson}
              style={style}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
