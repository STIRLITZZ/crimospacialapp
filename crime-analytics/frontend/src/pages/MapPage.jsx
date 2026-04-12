import { useEffect, useState } from "react";
import { useFilters } from "../context/FilterContext";
import { fetchGeoJSON, fetchHeatmapData } from "../services/api";

export default function MapPage() {
  const { buildFilterParams } = useFilters();
  const [geojson, setGeojson] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = buildFilterParams();
    setLoading(true);
    Promise.all([
      fetchGeoJSON(params).catch(() => null),
      fetchHeatmapData(params).catch(() => null),
    ])
      .then(([geo, heat]) => {
        setGeojson(geo);
        setHeatmap(heat);
      })
      .finally(() => setLoading(false));
  }, [buildFilterParams]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center mt-20">Loading map data...</div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Interactive Map</h2>
      <p className="text-gray-400 text-sm">
        Full Leaflet map will render here once the frontend dependencies are installed.
      </p>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold">Map Container</p>
          <p className="text-sm mt-2">
            {geojson
              ? `${geojson.features?.length || 0} area polygons loaded`
              : "No GeoJSON data"}
          </p>
          <p className="text-sm">
            {heatmap
              ? `${heatmap.points?.length || 0} heatmap points loaded`
              : "No heatmap data"}
          </p>
        </div>
      </div>
    </div>
  );
}
