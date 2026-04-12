import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.points?.length) return;

    const heat = L.heatLayer(data.points, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      max: data.max_intensity || 1,
      gradient: {
        0.1: "#3b82f6",
        0.3: "#06b6d4",
        0.5: "#f59e0b",
        0.7: "#ef4444",
        1.0: "#dc2626",
      },
    });

    heat.addTo(map);
    return () => {
      map.removeLayer(heat);
    };
  }, [map, data]);

  return null;
}
