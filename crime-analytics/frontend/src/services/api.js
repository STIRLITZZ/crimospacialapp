import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 30000,
});

// ── Data service ───────────────────────────────────────

export const fetchAreas = () =>
  api.get("/data/areas").then((r) => r.data);

export const fetchCrimeTypes = () =>
  api.get("/data/crime-types").then((r) => r.data);

export const fetchDateRange = () =>
  api.get("/data/date-range").then((r) => r.data);

// ── Analytics / Dashboard ──────────────────────────────

export const fetchDashboard = (filters = {}) =>
  api.get("/analytics/dashboard", { params: filters }).then((r) => r.data);

export const fetchTimeSeries = (filters = {}) =>
  api.get("/data/stats/by-time", { params: filters }).then((r) => r.data);

export const fetchHourlyDistribution = (filters = {}) =>
  api.get("/data/stats/hourly", { params: filters }).then((r) => r.data);

export const fetchStatsByArea = (filters = {}) =>
  api.get("/data/stats/by-area", { params: filters }).then((r) => r.data);

export const fetchStatsByCrimeType = (filters = {}, limit = 20) =>
  api.get("/data/stats/by-crime-type", { params: { ...filters, limit } }).then((r) => r.data);

export const fetchAreaTimeMatrix = (area_name, crm_cd_desc) =>
  api.get("/data/stats/area-time-matrix", { params: { area_name, crm_cd_desc } }).then((r) => r.data);

// ── Map service ────────────────────────────────────────

export const fetchHeatmapData = (filters = {}) =>
  api.get("/map/heatmap", { params: filters }).then((r) => r.data);

export const fetchGeoJSON = (filters = {}) =>
  api.get("/map/geojson/areas", { params: filters }).then((r) => r.data);

export const fetchClusters = (filters = {}) =>
  api.get("/map/clusters", { params: filters }).then((r) => r.data);

export const fetchIncidentPoints = (params = {}) =>
  api.get("/map/incident-points", { params }).then((r) => r.data);

// ── ML service ─────────────────────────────────────────

export const fetchPrediction = (input) =>
  api.post("/ml/predict", input).then((r) => r.data);

export const fetchModelInfo = () =>
  api.get("/ml/model-info").then((r) => r.data);

export const fetchAreaRiskPrediction = (input) =>
  api.post("/ml/predict-area-risk", input).then((r) => r.data);

export const trainModelFromCSV = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/ml/train-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000, // 10 min for large datasets
    })
    .then((r) => r.data);
};

export default api;
