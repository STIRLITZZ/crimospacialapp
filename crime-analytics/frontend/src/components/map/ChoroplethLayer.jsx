import { useRef, useMemo } from "react";
import { GeoJSON } from "react-leaflet";

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
      fillOpacity: 0.6,
      weight: 2,
      color: "#ffffff",
      dashArray: "3",
    };
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 3, fillOpacity: 0.8, dashArray: "" });
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
    () => (geojson ? JSON.stringify(geojson).slice(0, 80) : "empty"),
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
