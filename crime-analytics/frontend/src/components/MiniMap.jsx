import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { useFilters } from "../context/FilterContext";

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
        `Incidents: ${props.incident_count || 0}<br/>` +
        `Risk: ${props.risk_level || "N/A"}`,
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
      color: "#ffffff44",
      fillOpacity: 0.55,
    };
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-3">Area Risk Map</h3>
      <div className="h-[320px] rounded-lg overflow-hidden">
        <MapContainer
          center={LA_CENTER}
          zoom={10}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {geojson && geojson.features?.length > 0 && (
            <GeoJSON
              key={JSON.stringify(geojson).slice(0, 100)}
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
