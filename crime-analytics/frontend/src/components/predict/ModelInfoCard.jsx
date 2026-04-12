import { useEffect, useState } from "react";
import { fetchModelInfo } from "../../services/api";
import FeatureImportanceChart from "./FeatureImportanceChart";

export default function ModelInfoCard() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse space-y-4">
        <div className="h-4 w-40 bg-white/10 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-lg" />
        </div>
        <div className="h-[280px] bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Model Performance</h3>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
          <p className="text-yellow-400 text-sm mb-3">
            {error
              ? "No trained model found. Train a model first via the ML service."
              : "Unable to load model info."}
          </p>
          <button
            onClick={load}
            className="px-4 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const accuracy = info.accuracy || 0;
  const accPct = (accuracy * 100).toFixed(1);
  const numClasses = info.classes?.length || 0;

  // Gauge angle (0 to 180 degrees mapped from 0 to 100%)
  const gaugeAngle = Math.min(180, accuracy * 180);
  const gaugeColor =
    accuracy >= 0.7 ? "#10b981" : accuracy >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
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
          <p className="text-gray-500 text-xs uppercase mb-1">Training Date</p>
          <p className="text-white font-medium text-sm">
            {info.trained_date || "N/A"}
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase mb-1">Classes</p>
          <p className="text-white font-medium text-sm">{numClasses}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase mb-1">Status</p>
          <p className="text-green-400 font-medium text-sm">Active</p>
        </div>
      </div>

      {/* Accuracy gauge */}
      <div className="flex flex-col items-center">
        <p className="text-gray-400 text-xs uppercase mb-3">Overall Accuracy</p>
        <div className="relative w-48 h-24 overflow-hidden">
          {/* Background arc */}
          <div
            className="absolute bottom-0 left-0 w-48 h-48 rounded-full border-[12px] border-white/10"
            style={{ clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)" }}
          />
          {/* Filled arc */}
          <div
            className="absolute bottom-0 left-0 w-48 h-48 rounded-full border-[12px] border-transparent"
            style={{
              borderBottomColor: gaugeColor,
              borderLeftColor: gaugeAngle > 90 ? gaugeColor : "transparent",
              borderRightColor: "transparent",
              borderTopColor: "transparent",
              transform: `rotate(${gaugeAngle}deg)`,
              transformOrigin: "center center",
              clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
            }}
          />
          {/* Center label */}
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
  );
}
