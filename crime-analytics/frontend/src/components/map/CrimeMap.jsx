import { useCallback, useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import { Layers } from "lucide-react";
import ChoroplethLayer from "./ChoroplethLayer";
import HeatmapLayer from "./HeatmapLayer";
import MapLegend from "./MapLegend";
import { useTheme } from "../../context/ThemeContext";
import {
  translateCrimeType,
  translateSamplingLabel,
} from "../../lib/translations";

function clusterColor(count) {
  if (count >= 500) return { fill: "#dc2626", stroke: "#fca5a5" };
  if (count >= 200) return { fill: "#ea580c", stroke: "#fdba74" };
  if (count >= 80) return { fill: "#ca8a04", stroke: "#fde047" };
  if (count >= 30) return { fill: "#16a34a", stroke: "#86efac" };
  return { fill: "#2563eb", stroke: "#93c5fd" };
}

const LA_CENTER = [34.05, -118.25];
const LAYER_OPTIONS = [
  { value: "Choropleth", label: "Coropleta" },
  { value: "Heatmap", label: "Harta termica" },
  { value: "Clusters", label: "Clustere" },
  { value: "Dot Map", label: "Harta cu puncte" },
  { value: "Points", label: "Puncte individuale" },
];

function ZoomTracker({ onZoomChange, onBoundsChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
      const bounds = map.getBounds();
      onBoundsChange({
        lat_min: bounds.getSouth(),
        lat_max: bounds.getNorth(),
        lon_min: bounds.getWest(),
        lon_max: bounds.getEast(),
      });
    },
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        lat_min: bounds.getSouth(),
        lat_max: bounds.getNorth(),
        lon_min: bounds.getWest(),
        lon_max: bounds.getEast(),
      });
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
    const bounds = map.getBounds();
    onBoundsChange({
      lat_min: bounds.getSouth(),
      lat_max: bounds.getNorth(),
      lon_min: bounds.getWest(),
      lon_max: bounds.getEast(),
    });
  }, [map, onBoundsChange, onZoomChange]);

  return null;
}

export default function CrimeMap({
  geojson,
  heatmapData,
  clusterData,
  pointsData,
  activeLayer,
  onLayerChange,
  onAreaClick,
  onBoundsChange,
}) {
  const [internalLayer, setInternalLayer] = useState("Choropleth");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [zoom, setZoom] = useState(10);
  const { isDark } = useTheme();
  const currentLayer = activeLayer ?? internalLayer;
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const handleZoomChange = useCallback((value) => setZoom(value), []);
  const handleLayerChange = useCallback(
    (layer) => {
      if (onLayerChange) {
        onLayerChange(layer);
        return;
      }
      setInternalLayer(layer);
    },
    [onLayerChange]
  );

  const showPoints = currentLayer === "Points" && zoom > 10;
  const showDotMap = currentLayer === "Dot Map";
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
          url={tileUrl}
        />

        <ZoomTracker
          onZoomChange={handleZoomChange}
          onBoundsChange={onBoundsChange}
        />

        {currentLayer === "Choropleth" && (
          <ChoroplethLayer geojson={geojson} onAreaClick={onAreaClick} />
        )}

        {currentLayer === "Heatmap" && <HeatmapLayer data={heatmapData} />}

        {currentLayer === "Clusters" &&
          clusters.map((cluster, i) => {
            const radius = Math.max(10, Math.min(40, Math.sqrt(cluster.count) * 2.5));
            const { fill, stroke } = clusterColor(cluster.count);
            const topCrime = cluster.crime_types
              ? Object.entries(cluster.crime_types)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
              : [];
            return (
              <CircleMarker
                key={i}
                center={cluster.center}
                radius={radius}
                pathOptions={{
                  fillColor: fill,
                  fillOpacity: 0.7,
                  color: stroke,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -radius]} opacity={0.9} permanent={false}>
                  <span className="text-xs font-semibold">
                    {cluster.count.toLocaleString()}
                  </span>
                </Tooltip>
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-sm mb-1">
                      {cluster.count.toLocaleString()} incidente
                    </p>
                    {topCrime.map(([type, count]) => (
                      <p key={type} className="text-gray-600">
                        <span className="font-medium">
                          {translateCrimeType(type)}:
                        </span>{" "}
                        {count}
                      </p>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {showDotMap &&
          points.map((point, i) => (
            <CircleMarker
              key={`dot-${point.id || point.dr_no || i}`}
              center={[point.lat, point.lon]}
              radius={2.5}
              pathOptions={{
                fillColor: "#ef4444",
                fillOpacity: 0.28,
                color: "#f97316",
                opacity: 0.18,
                weight: 0.5,
              }}
            />
          ))}

        {showPoints &&
          points.map((point, i) => (
            <CircleMarker
              key={`point-${point.id || point.dr_no || i}`}
              center={[point.lat, point.lon]}
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
                  <p className="font-semibold">
                    {translateCrimeType(point.crm_cd_desc) || "Incident"}
                  </p>
                  <p>Zona: {point.area_name || "N/A"}</p>
                  <p>Data: {point.date_occ || "N/A"}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {showDotMap && pointsData && (
          <div className="leaflet-top leaflet-center">
            <div className="leaflet-control bg-gray-900/85 text-gray-200 text-xs px-3 py-1.5 rounded">
              Afisez {pointsData.count?.toLocaleString() || 0} puncte
              {pointsData.sampled && pointsData.total_in_bounds
                ? ` din ${pointsData.total_in_bounds.toLocaleString()} incidente din vedere (${translateSamplingLabel(pointsData.sampling_label)})`
                : ""}
            </div>
          </div>
        )}

        {currentLayer === "Points" && !showPoints && (
          <div className="leaflet-top leaflet-center">
            <div className="leaflet-control bg-gray-900/80 text-gray-300 text-xs px-3 py-1.5 rounded">
              Mareste harta pentru a vedea incidentele individuale
            </div>
          </div>
        )}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="bg-gray-800/90 backdrop-blur border border-white/10 rounded-lg p-2 text-gray-300 hover:text-white transition-colors"
          title="Comuta straturile"
        >
          <Layers size={18} />
        </button>
        {showLayerMenu && (
          <div className="mt-1 bg-gray-800/95 backdrop-blur border border-white/10 rounded-lg py-1 min-w-[170px]">
            {LAYER_OPTIONS.map((layer) => (
              <button
                key={layer.value}
                onClick={() => {
                  handleLayerChange(layer.value);
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  currentLayer === layer.value
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {currentLayer === "Choropleth" && <MapLegend />}
    </div>
  );
}
