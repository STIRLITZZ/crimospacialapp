import { useRef, useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import { translateRiskLevel } from "../../lib/translations";

const RISK_COLORS = {
  very_low: "#2ecc71",
  low: "#27ae60",
  medium: "#f39c12",
  high: "#e67e22",
  very_high: "#e74c3c",
};

export default function ChoroplethLayer({ geojson, onAreaClick }) {
  const geoRef = useRef(null);

  const style = (feature) => {
    const level = feature.properties?.risk_level || "medium";
    return {
      fillColor: RISK_COLORS[level] || "#f39c12",
      fillOpacity: 0.55,
      weight: 1.5,
      opacity: 0.8,
      color: "var(--map-stroke)",
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    layer.bindTooltip(
      `<strong>${props.area_name}</strong><br/>` +
        `Incidente: ${props.incident_count || 0}<br/>` +
        `Risc: ${translateRiskLevel(props.risk_level) || "N/A"}`,
      { sticky: true }
    );

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, fillOpacity: 0.72 });
        e.target.bringToFront();
      },
      mouseout: (e) => {
        if (geoRef.current) {
          geoRef.current.resetStyle(e.target);
        }
      },
      click: () => {
        if (onAreaClick) onAreaClick(feature.properties);
      },
    });
  };

  const key = useMemo(
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

  if (!geojson || !geojson.features?.length) return null;

  return (
    <GeoJSON
      ref={geoRef}
      key={key}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}
