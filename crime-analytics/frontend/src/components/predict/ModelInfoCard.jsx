import { useEffect, useRef, useState } from "react";
import { fetchModelInfo, trainModelFromCSV } from "../../services/api";
import FeatureImportanceChart from "./FeatureImportanceChart";

export default function ModelInfoCard() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Training state
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [trainError, setTrainError] = useState("");
  const fileRef = useRef(null);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchModelInfo()
      .then(setInfo)
      .catch(() => {
        setInfo(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleTrain = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setTrainError("Select a CSV file first.");
      return;
    }
    setTraining(true);
    setTrainError("");
    setTrainResult(null);
    try {
      const res = await trainModelFromCSV(file);
      setTrainResult(res);
      load(); // reload model info
    } catch (err) {
      setTrainError(
        err.response?.data?.detail || "Training failed. Check your CSV format."
      );
    } finally {
      setTraining(false);
    }
  };

  // ── Training section (always visible) ──────────────
  const trainSection = (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold">Train Model from CSV</h3>

      <p className="text-gray-400 text-xs leading-relaxed">
        Upload your CSV with columns:{" "}
        <span className="text-gray-300">
          Hour, AREA, Rpt Dist No, Crm Cd, Vict Age, Vict Sex, Vict Descent,
          Premis Cd, Weapon Used Cd, LAT, LON, Year, Month, Day
        </span>
      </p>

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="flex-1 text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
        />
      </div>

      <button
        onClick={handleTrain}
        disabled={training}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
      >
        {training ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Training...
          </span>
        ) : (
          "Upload & Train Model"
        )}
      </button>

      {trainError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm">{trainError}</p>
        </div>
      )}

      {trainResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-2">
          <p className="text-green-400 text-sm font-medium">
            Training complete!
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Best Model:</span>{" "}
              <span className="text-gray-200">
                {trainResult.best_model}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Accuracy:</span>{" "}
              <span className="text-green-300">
                {(trainResult.accuracy * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Rows Used:</span>{" "}
              <span className="text-gray-200">{trainResult.rows_used}</span>
            </div>
            <div>
              <span className="text-gray-500">Crime Types:</span>{" "}
              <span className="text-gray-200">
                {trainResult.crime_types_count}
              </span>
            </div>
          </div>

          {/* Models comparison */}
          {trainResult.models_comparison && (
            <div className="mt-2">
              <p className="text-gray-500 text-xs uppercase mb-1">
                Models Comparison
              </p>
              <div className="space-y-1">
                {Object.entries(trainResult.models_comparison).map(
                  ([name, data]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-32 truncate">
                        {name}
                      </span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${data.accuracy * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-300 text-xs w-12 text-right">
                        {(data.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Model info section ─────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        {trainSection}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse space-y-4">
          <div className="h-4 w-40 bg-white/10 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-white/5 rounded-lg" />
            <div className="h-20 bg-white/5 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="space-y-6">
        {trainSection}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Model Performance</h3>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
            <p className="text-yellow-400 text-sm mb-3">
              No trained model found. Upload a CSV above to train.
            </p>
            <button
              onClick={load}
              className="px-4 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const accuracy = info.accuracy || 0;
  const accPct = (accuracy * 100).toFixed(1);
  const numClasses = info.classes?.length || 0;

  const gaugeAngle = Math.min(180, accuracy * 180);
  const gaugeColor =
    accuracy >= 0.7 ? "#10b981" : accuracy >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-6">
      {trainSection}

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
        <h3 className="text-white font-semibold">Model Performance</h3>

        {/* Info cards grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase mb-1">Model Type</p>
            <p className="text-white font-medium text-sm">
              {info.model_type || "Unknown"}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase mb-1">
              Training Date
            </p>
            <p className="text-white font-medium text-sm">
              {info.trained_date
                ? new Date(info.trained_date).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase mb-1">
              Crime Types
            </p>
            <p className="text-white font-medium text-sm">{numClasses}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase mb-1">Target</p>
            <p className="text-white font-medium text-sm">
              {info.target_column || "Crm Cd"}
            </p>
          </div>
        </div>

        {/* Accuracy gauge */}
        <div className="flex flex-col items-center">
          <p className="text-gray-400 text-xs uppercase mb-3">
            Overall Accuracy
          </p>
          <div className="relative w-48 h-24 overflow-hidden">
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full border-[12px] border-white/10"
              style={{
                clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full border-[12px] border-transparent"
              style={{
                borderBottomColor: gaugeColor,
                borderLeftColor:
                  gaugeAngle > 90 ? gaugeColor : "transparent",
                borderRightColor: "transparent",
                borderTopColor: "transparent",
                transform: `rotate(${gaugeAngle}deg)`,
                transformOrigin: "center center",
                clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
              }}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <span
                className="text-3xl font-bold"
                style={{ color: gaugeColor }}
              >
                {accPct}
              </span>
              <span className="text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Feature importances */}
        <FeatureImportanceChart importances={info.feature_importances} />
      </div>
    </div>
  );
}
