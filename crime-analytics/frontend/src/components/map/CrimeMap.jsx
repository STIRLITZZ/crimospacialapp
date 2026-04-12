import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet";
import { Layers } from "lucide-react";
import ChoroplethLayer from "./ChoroplethLayer";
import HeatmapLayer from "./HeatmapLayer";
import MapLegend from "./MapLegend";

const LA_CENTER = [34.05, -118.25];
const LAYER_OPTIONS = ["Choropleth", "Heatmap", "Clusters", "Points"];

function ZoomTracker({ onZoomChange, onBoundsChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
      const b = map.getBounds();
      onBoundsChange({
        lat_min: b.getSouth(),
        lat_max: b.getNorth(),
        lon_min: b.getWest(),
        lon_max: b.getEast(),
      });
    },
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        lat_min: b.getSouth(),
        lat_max: b.getNorth(),
        lon_min: b.getWest(),
        lon_max: b.getEast(),
      });
    },
  });
  return null;
}

export default function CrimeMap({
  geojson,
  heatmapData,
  clusterData,
  pointsData,
  onAreaClick,
  onBoundsChange,
}) {
  const [activeLayer, setActiveLayer] = useState("Choropleth");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [zoom, setZoom] = useState(10);

  const handleZoomChange = useCallback((z) => setZoom(z), []);

  // Show points layer content only at zoom > 14
  const showPoints = activeLayer === "Points" && zoom > 14;
  const points = pointsData?.points || [];
  const clusters = clusterData?.clusters || [];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={LA_CENTER}
        zoom={10}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ZoomTracker
          onZoomChange={handleZoomChange}
          onBoundsChange={onBoundsChange}
        />

        {/* Choropleth Layer */}
        {activeLayer === "Choropleth" && (
          <ChoroplethLayer geojson={geojson} onAreaClick={onAreaClick} />
        )}

        {/* Heatmap Layer */}
        {activeLayer === "Heatmap" && <HeatmapLayer data={heatmapData} />}

        {/* Clusters Layer */}
        {activeLayer === "Clusters" &&
          clusters.map((c, i) => {
            const radius = Math.max(8, Math.min(30, Math.sqrt(c.count) * 2));
            const topCrime = c.crime_types
              ? Object.entries(c.crime_types)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
              : [];
            return (
              <CircleMarker
                key={i}
                center={c.center}
                radius={radius}
                pathOptions={{
                  fillColor: "#3b82f6",
                  fillOpacity: 0.6,
                  color: "#60a5fa",
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">
                      {c.count.toLocaleString()} incidents
                    </p>
                    {topCrime.map(([type, count]) => (
                      <p key={type}>
                        {type}: {count}
                      </p>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Points Layer (zoom > 14 only) */}
        {showPoints &&
          points.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lon]}
              radius={4}
              pathOptions={{
                fillColor: "#ef4444",
                fillOpacity: 0.7,
                color: "#fca5a5",
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{p.crm_cd_desc || "Incident"}</p>
                  <p>Area: {p.area_name || "N/A"}</p>
                  <p>Date: {p.date_occ || "N/A"}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Points layer zoom hint */}
        {activeLayer === "Points" && !showPoints && (
          <div className="leaflet-top leaflet-center">
            <div className="leaflet-control bg-gray-900/80 text-gray-300 text-xs px-3 py-1.5 rounded">
              Zoom in past level 14 to see individual points
            </div>
          </div>
        )}
      </MapContainer>

      {/* Layer Toggle Button (top-right) */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="bg-gray-800/90 backdrop-blur border border-white/10 rounded-lg p-2 text-gray-300 hover:text-white transition-colors"
          title="Toggle layers"
        >
          <Layers size={18} />
        </button>
        {showLayerMenu && (
          <div className="mt-1 bg-gray-800/95 backdrop-blur border border-white/10 rounded-lg py-1 min-w-[140px]">
            {LAYER_OPTIONS.map((layer) => (
              <button
                key={layer}
                onClick={() => {
                  setActiveLayer(layer);
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  activeLayer === layer
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend (bottom-left) */}
      {activeLayer === "Choropleth" && <MapLegend />}
    </div>
  );
}
