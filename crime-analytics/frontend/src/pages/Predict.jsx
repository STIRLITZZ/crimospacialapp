import { useState } from "react";
import { fetchPrediction, fetchModelInfo } from "../services/api";

const INITIAL_FORM = {
  year: 2024,
  month: 1,
  day: 15,
  hour: 12,
  area: 1,
  vict_age: 30,
  vict_sex: "M",
  lat: 34.05,
  lon: -118.25,
  is_weekend: false,
  is_night: false,
  quarter: 1,
};

export default function Predict() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetchPrediction(form);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const loadModelInfo = async () => {
    try {
      const info = await fetchModelInfo();
      setModelInfo(info);
    } catch {
      setModelInfo(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Crime Prediction</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Input Parameters</h3>
          <form onSubmit={handlePredict} className="grid grid-cols-2 gap-3">
            {["year", "month", "day", "hour", "area", "vict_age", "quarter"].map(
              (field) => (
                <label key={field} className="text-sm text-gray-300">
                  <span className="block mb-1 capitalize">{field.replace("_", " ")}</span>
                  <input
                    type="number"
                    name={field}
                    value={form[field]}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-primary-500"
                  />
                </label>
              )
            )}
            <label className="text-sm text-gray-300">
              <span className="block mb-1">Vict Sex</span>
              <select
                name="vict_sex"
                value={form.vict_sex}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-200 focus:outline-none"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="X">Unknown</option>
              </select>
            </label>
            <label className="text-sm text-gray-300">
              <span className="block mb-1">Latitude</span>
              <input
                type="number"
                step="0.001"
                name="lat"
                value={form.lat}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-200 focus:outline-none"
              />
            </label>
            <label className="text-sm text-gray-300">
              <span className="block mb-1">Longitude</span>
              <input
                type="number"
                step="0.001"
                name="lon"
                value={form.lon}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-200 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 col-span-1">
              <input
                type="checkbox"
                name="is_weekend"
                checked={form.is_weekend}
                onChange={handleChange}
              />
              Weekend
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 col-span-1">
              <input
                type="checkbox"
                name="is_night"
                checked={form.is_night}
                onChange={handleChange}
              />
              Night
            </label>
            <button
              type="submit"
              disabled={loading}
              className="col-span-2 mt-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "Predicting..." : "Predict Crime Type"}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Result */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Prediction Result</h3>
          {result ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase">Predicted Type</p>
                <p className="text-xl font-bold text-white">
                  {result.predicted_crime_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Confidence</p>
                <p className="text-lg text-primary-500">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
              {result.top_probabilities?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-2">
                    Top Probabilities
                  </p>
                  <ul className="space-y-1 text-sm text-gray-300">
                    {result.top_probabilities.map((p) => (
                      <li key={p.crime_type} className="flex justify-between">
                        <span className="truncate mr-2">{p.crime_type}</span>
                        <span className="font-mono">
                          {(p.probability * 100).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">
              Submit the form to see predictions.
            </p>
          )}

          <button
            onClick={loadModelInfo}
            className="mt-6 text-sm text-primary-500 hover:underline"
          >
            Load Model Info
          </button>
          {modelInfo && (
            <div className="mt-3 text-sm text-gray-400 space-y-1">
              <p>Type: {modelInfo.model_type}</p>
              <p>Accuracy: {(modelInfo.accuracy * 100).toFixed(1)}%</p>
              <p>Trained: {modelInfo.trained_date}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
