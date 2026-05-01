import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchHotspotModelInfo,
  fetchHotspotModels,
  predictHotspots,
} from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import FeatureImportanceChart from "./FeatureImportanceChart";
import TabNavigation from "../ui/TabNavigation";
import {
  MONTHS_FULL_RO,
  WEEKDAYS_FULL_RO,
  translateCrimeType,
  translateCrimeTypeBilingual,
  translateModelType,
} from "../../lib/translations";

const MONTHS = [
  { value: "", label: "Toate lunile" },
  ...MONTHS_FULL_RO.map((label, index) => ({
    value: index + 1,
    label,
  })),
];

const DAYS_OF_WEEK = [
  { value: "", label: "Orice zi" },
  ...WEEKDAYS_FULL_RO.map((label, index) => ({
    value: index,
    label,
  })),
];

const LAPD_AREAS = [
  { value: "", label: "Toate zonele" },
  { value: 1, label: "1 - Central" },
  { value: 2, label: "2 - Rampart" },
  { value: 3, label: "3 - Southwest" },
  { value: 4, label: "4 - Hollenbeck" },
  { value: 5, label: "5 - Harbor" },
  { value: 6, label: "6 - Hollywood" },
  { value: 7, label: "7 - Wilshire" },
  { value: 8, label: "8 - West LA" },
  { value: 9, label: "9 - Van Nuys" },
  { value: 10, label: "10 - West Valley" },
  { value: 11, label: "11 - Northeast" },
  { value: 12, label: "12 - 77th Street" },
  { value: 13, label: "13 - Newton" },
  { value: 14, label: "14 - Pacific" },
  { value: 15, label: "15 - N Hollywood" },
  { value: 16, label: "16 - Foothill" },
  { value: 17, label: "17 - Devonshire" },
  { value: 18, label: "18 - Southeast" },
  { value: 19, label: "19 - Mission" },
  { value: 20, label: "20 - Olympic" },
  { value: 21, label: "21 - Topanga" },
];

const RESULT_TABS = [
  { key: "map", label: "Harta" },
  { key: "statistics", label: "Statistici" },
  { key: "details", label: "Detalii hotspot" },
  { key: "model", label: "Detalii model" },
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  fontSize: 12,
  boxShadow: "0 18px 40px rgba(var(--shadow-rgb), 0.16)",
};

function hotspotStyle(probability, isPrimary) {
  if (probability >= 0.15) {
    return {
      fillColor: "#dc2626",
      strokeColor: isPrimary ? "#fee2e2" : "#fecaca",
      radius: isPrimary ? 18 : 14,
      fillOpacity: 0.8,
    };
  }
  if (probability >= 0.08) {
    return {
      fillColor: "#ea580c",
      strokeColor: isPrimary ? "#ffedd5" : "#fdba74",
      radius: isPrimary ? 15 : 11,
      fillOpacity: 0.72,
    };
  }
  return {
    fillColor: "#eab308",
    strokeColor: isPrimary ? "#fef9c3" : "#fde047",
    radius: isPrimary ? 12 : 9,
    fillOpacity: 0.64,
  };
}

function getRiskTier(probabilityPct) {
  if (probabilityPct >= 90) {
    return {
      label: "Risc ridicat",
      badgeClass: "bg-red-500/15 text-red-300 border border-red-500/20",
    };
  }
  if (probabilityPct >= 80) {
    return {
      label: "Risc mediu",
      badgeClass: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
    };
  }
  return {
    label: "Risc redus",
    badgeClass: "bg-yellow-500/15 text-yellow-200 border border-yellow-500/20",
  };
}

function getDisplayProbabilityPct(hotspot) {
  return Number(
    hotspot?.display_probability_pct ?? hotspot?.probability_pct ?? 0
  );
}

function formatPercent(value, digits = 1) {
  return `${((value || 0) * 100).toFixed(digits)}%`;
}

function parseScenarioDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  const dayOfWeek = (candidate.getDay() + 6) % 7;

  return {
    value: `${match[1]}-${match[2]}-${match[3]}`,
    year,
    month,
    day,
    dayOfWeek,
    monthLabel: MONTHS_FULL_RO[month - 1],
    weekdayLabel: WEEKDAYS_FULL_RO[dayOfWeek],
  };
}

function MetricTile({ label, value, tone = "text-white" }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <p className="text-gray-500 uppercase text-[11px]">{label}</p>
      <p className={`font-semibold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

function MapFocus({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 12), {
      animate: true,
      duration: 0.8,
    });
  }, [map, target]);

  return null;
}

function HotspotMap({ hotspots, cityCenter, selectedHotspot, tileUrl }) {
  const fallbackCenter = useMemo(() => {
    if (selectedHotspot) {
      return [selectedHotspot.latitude, selectedHotspot.longitude];
    }
    if (hotspots.length > 0) {
      return [hotspots[0].latitude, hotspots[0].longitude];
    }
    if (cityCenter) {
      return [cityCenter.latitude, cityCenter.longitude];
    }
    return [34.05, -118.25];
  }, [cityCenter, hotspots, selectedHotspot]);

  return (
    <div className="h-[320px] rounded-xl overflow-hidden border border-white/10">
      <MapContainer
        center={fallbackCenter}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer attribution="&copy; OSM" url={tileUrl} />
        <MapFocus target={selectedHotspot} />

        {hotspots.map((hotspot) => {
          const isPrimary = hotspot.rank === 1;
          const style = hotspotStyle(hotspot.probability, isPrimary);

          return (
            <CircleMarker
              key={`${hotspot.zone_id}-${hotspot.rank}`}
              center={[hotspot.latitude, hotspot.longitude]}
              radius={style.radius}
              pathOptions={{
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
                color: style.strokeColor,
                weight: isPrimary ? 3 : 2,
              }}
            >
              {isPrimary && (
                <LeafletTooltip direction="top" offset={[0, -style.radius]}>
                  Hotspot principal
                </LeafletTooltip>
              )}
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm">Hotspot #{hotspot.rank}</p>
                  <p>Zona: {hotspot.zone_id}</p>
                  <p>Probabilitate: {hotspot.display_probability_pct.toFixed(2)}%</p>
                  <p>Locatie: {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default function HotspotPredictionCard() {
  const { isDark } = useTheme();
  const now = new Date();
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [result, setResult] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [activeTab, setActiveTab] = useState("map");
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoLoading, setModelInfoLoading] = useState(false);
  const [modelInfoError, setModelInfoError] = useState("");
  const [form, setForm] = useState({
    crime_code: "",
    prediction_date: "",
    month: "",
    hour: now.getHours(),
    day_of_week: "",
    area: "",
    top_n: 5,
  });

  const loadModels = useCallback(() => {
    setModelsLoading(true);
    setModelsError("");

    fetchHotspotModels()
      .then((response) => {
        const nextModels = response.models || [];
        setModels(nextModels);
        setForm((prev) => {
          const currentCode = Number(prev.crime_code);
          const hasCurrent = nextModels.some(
            (model) => model.crime_code === currentCode
          );
          if (hasCurrent) {
            return prev;
          }
          return {
            ...prev,
            crime_code: nextModels[0]?.crime_code ?? "",
          };
        });
      })
      .catch((err) => {
        setModels([]);
        setModelsError(
          err.response?.data?.detail ||
            "Modelele de hotspot din crime/ nu sunt disponibile acum."
        );
      })
      .finally(() => setModelsLoading(false));
  }, []);

  const loadModelInfo = useCallback(async (crimeCode) => {
    if (!crimeCode) {
      setModelInfo(null);
      setModelInfoError("");
      return;
    }

    setModelInfoLoading(true);
    setModelInfoError("");

    try {
      const response = await fetchHotspotModelInfo(crimeCode);
      setModelInfo(response);
    } catch (err) {
      setModelInfo(null);
      setModelInfoError(
        err.response?.data?.detail ||
          "Statisticile detaliate nu sunt disponibile pentru acest model de hotspot."
      );
    } finally {
      setModelInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const selectedCrimeCode = Number(form.crime_code) || null;
  const scenarioDate = useMemo(
    () => parseScenarioDate(form.prediction_date),
    [form.prediction_date]
  );
  const effectiveMonth = scenarioDate ? String(scenarioDate.month) : form.month;
  const effectiveDayOfWeek = scenarioDate
    ? String(scenarioDate.dayOfWeek)
    : form.day_of_week;
  const hotspots = useMemo(
    () =>
      (result?.hotspots || []).map((hotspot) => ({
        ...hotspot,
        display_probability_pct: getDisplayProbabilityPct(hotspot),
      })),
    [result]
  );

  useEffect(() => {
    setSelectedHotspot(hotspots[0] || null);
  }, [hotspots]);

  useEffect(() => {
    if (!selectedCrimeCode) {
      return;
    }
    loadModelInfo(selectedCrimeCode);
  }, [selectedCrimeCode, loadModelInfo]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!form.crime_code) {
      setPredictionError("Selecteaza un model de infractiune inainte sa prezici hotspot-uri.");
      return;
    }
    if (form.prediction_date && !scenarioDate) {
      setPredictionError("Data scenariului nu este valida. Alege o data calendaristica valida.");
      return;
    }

    setPredictionLoading(true);
    setPredictionError("");
    setResult(null);

    const payload = {
      crime_code: Number(form.crime_code),
      hour: Number(form.hour),
      top_n: Number(form.top_n),
    };

    if (scenarioDate) {
      payload.prediction_date = scenarioDate.value;
      payload.month = scenarioDate.month;
      payload.day_of_week = scenarioDate.dayOfWeek;
    } else {
      if (form.month !== "") {
        payload.month = Number(form.month);
      }
      if (form.day_of_week !== "") {
        payload.day_of_week = Number(form.day_of_week);
      }
    }
    if (form.area !== "") {
      payload.area = Number(form.area);
    }

    try {
      const response = await predictHotspots(payload);
      setResult(response);
      setActiveTab("map");
    } catch (err) {
      setPredictionError(
        err.response?.data?.detail ||
          "Predictia hotspot-urilor a esuat. Verifica modelele si incearca din nou."
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  const topHotspot = hotspots[0] || null;

  const probabilityChartData = useMemo(
    () =>
      hotspots.map((hotspot) => ({
        name: `Zona ${hotspot.zone_id}`,
        probability: Number(hotspot.display_probability_pct.toFixed(2)),
      })),
    [hotspots]
  );

  const hotspotSummary = useMemo(() => {
    if (!hotspots.length) {
      return null;
    }

    const values = hotspots.map((hotspot) => hotspot.display_probability_pct);
    return {
      meanProbability:
        values.reduce((sum, value) => sum + value, 0) / values.length,
      maxProbability: Math.max(...values),
      minProbability: Math.min(...values),
      totalProbability: values.reduce((sum, value) => sum + value, 0),
      topThreeCoverage: values.slice(0, 3).reduce((sum, value) => sum + value, 0),
      topFiveCoverage: values.slice(0, 5).reduce((sum, value) => sum + value, 0),
      hotspotCount: hotspots.length,
    };
  }, [hotspots]);

  const detailRows = useMemo(
    () =>
      hotspots.map((hotspot) => ({
        ...hotspot,
        risk: getRiskTier(hotspot.display_probability_pct),
      })),
    [hotspots]
  );

  const handleDownloadCsv = () => {
    if (!detailRows.length) {
      return;
    }

    const rows = [
      "rank,zone_id,risk_level,probability_pct,latitude,longitude",
      ...detailRows.map((row) =>
        [
          row.rank,
          row.zone_id,
          row.risk.label,
          row.display_probability_pct.toFixed(4),
          row.latitude.toFixed(6),
          row.longitude.toFixed(6),
        ].join(",")
      ),
    ];

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `hotspots_crime_${result?.crime_code || selectedCrimeCode || "selected"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold">Predictie hotspot-uri infractionale</h3>
          <p className="text-gray-400 text-sm mt-1">
            Modelele din <span className="font-mono">crime/</span> ruleaza aici, in sectiunea de predictii.
          </p>
        </div>
        <button
          onClick={loadModels}
          className="text-sm text-blue-300 hover:text-white transition-colors"
        >
          Reincarca modelele
        </button>
      </div>

      {modelsError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-300 text-sm">{modelsError}</p>
        </div>
      )}

      <form onSubmit={handlePredict} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Model infractiune
            </span>
            <select
              value={form.crime_code}
              onChange={(e) => update("crime_code", e.target.value)}
              disabled={modelsLoading || models.length === 0}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">
                {modelsLoading ? "Se incarca modelele..." : "Selecteaza modelul"}
              </option>
              {models.map((model) => (
                <option key={model.crime_code} value={model.crime_code}>
                  {translateCrimeTypeBilingual(model.label)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Zona LAPD
            </span>
            <select
              value={form.area}
              onChange={(e) => update("area", e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {LAPD_AREAS.map((area) => (
                <option key={area.label} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Data scenariului
            </span>
            <input
              type="date"
              value={form.prediction_date}
              onChange={(e) => update("prediction_date", e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Accepta si date din viitor. Luna si ziua saptamanii se completeaza automat.
            </p>
            {scenarioDate && (
              <p className="mt-1 text-[11px] text-blue-300">
                {scenarioDate.weekdayLabel}, {scenarioDate.day} {scenarioDate.monthLabel}{" "}
                {scenarioDate.year}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Luna
            </span>
            <select
              value={effectiveMonth}
              onChange={(e) => update("month", e.target.value)}
              disabled={Boolean(scenarioDate)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {MONTHS.map((month) => (
                <option key={month.label} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Ziua saptamanii
            </span>
            <select
              value={effectiveDayOfWeek}
              onChange={(e) => update("day_of_week", e.target.value)}
              disabled={Boolean(scenarioDate)}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.label} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Numar hotspot-uri
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={form.top_n}
              onChange={(e) => update("top_n", parseInt(e.target.value, 10) || 1)}
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

        <button
          type="submit"
          disabled={predictionLoading || modelsLoading || models.length === 0}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {predictionLoading ? "Se calculeaza hotspot-urile..." : "Prezice hotspot-urile"}
        </button>
      </form>

      {predictionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-300 text-sm">{predictionError}</p>
        </div>
      )}

      {!result && !predictionError && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-sm">
            Selecteaza un model si ruleaza predictia pentru a vedea hotspot-urile pe harta.
          </p>
        </div>
      )}

      {(result || modelInfo || modelInfoLoading) && (
        <div className="space-y-5">
          <TabNavigation
            tabs={RESULT_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {activeTab === "map" && (
            result ? (
              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,0.8fr] gap-5">
                <HotspotMap
                  hotspots={hotspots}
                  cityCenter={result.city_center}
                  selectedHotspot={selectedHotspot}
                  tileUrl={tileUrl}
                />

                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <p className="text-white font-medium text-sm">
                      {translateCrimeType(result.label)}
                    </p>
                    {topHotspot ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <MetricTile label="Hotspot principal" value={`Zona ${topHotspot.zone_id}`} />
                        <MetricTile
                          label="Probabilitate"
                          value={`${topHotspot.display_probability_pct.toFixed(2)}%`}
                          tone="text-rose-300"
                        />
                        <MetricTile
                          label="Acuratete model"
                          value={formatPercent(result.model_metrics?.test_accuracy)}
                        />
                        <MetricTile
                          label="Esantioane antrenare"
                          value={(result.model_metrics?.n_samples || 0).toLocaleString()}
                        />
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        Niciun hotspot nu a depasit pragul configurat de probabilitate.
                      </p>
                    )}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
                      Hotspot-uri prezise
                    </p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {hotspots.map((hotspot) => (
                        <button
                          key={`${hotspot.zone_id}-${hotspot.rank}`}
                          onClick={() => setSelectedHotspot(hotspot)}
                          className={`w-full text-left rounded-xl px-3 py-3 border transition-colors ${
                            selectedHotspot?.zone_id === hotspot.zone_id &&
                            selectedHotspot?.rank === hotspot.rank
                              ? "bg-rose-500/10 border-rose-500/30"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-white text-sm font-medium">
                                #{hotspot.rank} Zona {hotspot.zone_id}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">
                                {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                              </p>
                            </div>
                            <p className="text-rose-300 text-sm font-semibold">
                              {hotspot.display_probability_pct.toFixed(2)}%
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-gray-400 text-sm">
                  Ruleaza o predictie de hotspot pentru a vedea harta interactiva si clasamentul zonelor.
                </p>
              </div>
            )
          )}

          {activeTab === "statistics" && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-5">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white font-semibold mb-4">
                  Distributia probabilitatilor
                </p>
                {probabilityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={probabilityChartData} margin={{ left: 8, right: 16 }}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <RechartsTooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value) => [`${value}%`, "Probabilitate"]}
                      />
                      <Bar dataKey="probability" radius={[10, 10, 0, 0]} fill="#f43f5e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Ruleaza o predictie pentru a vedea distributia geografica a probabilitatilor.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-white font-semibold mb-4">Statistici rezumative</p>
                  {hotspotSummary ? (
                    <div className="grid grid-cols-2 gap-3">
                      <MetricTile
                        label="Probabilitate medie"
                        value={`${hotspotSummary.meanProbability.toFixed(2)}%`}
                      />
                      <MetricTile
                        label="Probabilitate maxima"
                        value={`${hotspotSummary.maxProbability.toFixed(2)}%`}
                        tone="text-rose-300"
                      />
                      <MetricTile
                        label="Probabilitate minima"
                        value={`${hotspotSummary.minProbability.toFixed(2)}%`}
                      />
                      <MetricTile
                        label="Zone prezise"
                        value={hotspotSummary.hotspotCount}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Statisticile detaliate apar dupa rularea unei predictii.
                    </p>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-white font-semibold mb-4">Acoperire</p>
                  {hotspotSummary ? (
                    <div className="space-y-3">
                      <MetricTile
                        label="Probabilitate cumulata"
                        value={`${hotspotSummary.totalProbability.toFixed(2)}%`}
                      />
                      <MetricTile
                        label="Acoperire top 3"
                        value={`${hotspotSummary.topThreeCoverage.toFixed(2)}%`}
                      />
                      <MetricTile
                        label="Acoperire top 5"
                        value={`${hotspotSummary.topFiveCoverage.toFixed(2)}%`}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Indicatorii de acoperire depind de rezultatele curente.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">Clasament detaliat al hotspot-urilor</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Coordonatele exacte, nivelul de risc si probabilitatea pentru fiecare zona prezisa.
                  </p>
                </div>
                <button
                  onClick={handleDownloadCsv}
                  disabled={!detailRows.length}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Descarca CSV
                </button>
              </div>

              {detailRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-white/10">
                        <th className="py-3 pr-4">Rang</th>
                        <th className="py-3 pr-4">Zona</th>
                        <th className="py-3 pr-4">Risc</th>
                        <th className="py-3 pr-4">Probabilitate</th>
                        <th className="py-3 pr-4">Latitudine</th>
                        <th className="py-3 pr-4">Longitudine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((row) => (
                        <tr
                          key={`${row.zone_id}-${row.rank}`}
                          className="border-b border-white/5 text-gray-200"
                        >
                          <td className="py-3 pr-4 font-medium">#{row.rank}</td>
                          <td className="py-3 pr-4">Zona {row.zone_id}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${row.risk.badgeClass}`}>
                              {row.risk.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-rose-300 font-semibold">
                            {row.display_probability_pct.toFixed(2)}%
                          </td>
                          <td className="py-3 pr-4">{row.latitude.toFixed(6)}</td>
                          <td className="py-3 pr-4">{row.longitude.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Ruleaza mai intai o predictie pentru a vedea tabelul detaliat.
                </p>
              )}
            </div>
          )}

          {activeTab === "model" && (
            <div className="grid grid-cols-1 xl:grid-cols-[0.85fr,1.15fr] gap-5">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-white font-semibold">
                    {translateCrimeType(modelInfo?.label || result?.label || "Model hotspot")}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Metrici de performanta si informatii despre model pentru tipul de infractiune selectat.
                  </p>
                </div>

                {modelInfoError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-300 text-sm">{modelInfoError}</p>
                  </div>
                )}

                {modelInfoLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-20 bg-white/5 rounded-lg" />
                    <div className="h-20 bg-white/5 rounded-lg" />
                    <div className="h-20 bg-white/5 rounded-lg" />
                  </div>
                ) : modelInfo ? (
                  <div className="grid grid-cols-2 gap-3">
                    <MetricTile
                      label="Tip model"
                      value={translateModelType(modelInfo.model_type || "unknown")}
                    />
                    <MetricTile
                      label="Acuratete"
                      value={formatPercent(modelInfo.metrics?.test_accuracy)}
                      tone="text-emerald-300"
                    />
                    <MetricTile
                      label="F1 Macro"
                      value={formatPercent(modelInfo.metrics?.test_f1_macro)}
                    />
                    <MetricTile
                      label="Esantioane antrenare"
                      value={(modelInfo.metrics?.n_samples || 0).toLocaleString()}
                    />
                    <MetricTile
                      label="Zone geografice"
                      value={modelInfo.n_zones || 0}
                    />
                    <MetricTile
                      label="Variabile"
                      value={
                        modelInfo.metrics?.n_features ||
                        modelInfo.feature_importance?.length ||
                        0
                      }
                    />
                    <MetricTile
                      label="Acuratete top 3"
                      value={formatPercent(modelInfo.metrics?.test_top3_accuracy)}
                    />
                    <MetricTile
                      label="Acuratete top 5"
                      value={formatPercent(modelInfo.metrics?.test_top5_accuracy)}
                    />
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Selecteaza un model de infractiune pentru a vedea metricile detaliate.
                  </p>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <FeatureImportanceChart
                  importances={modelInfo?.feature_importance}
                  loading={modelInfoLoading}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
