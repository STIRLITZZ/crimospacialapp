import { useState } from "react";
import { fetchPrediction } from "../services/api";
import PredictionForm from "../components/predict/PredictionForm";
import PredictionResult from "../components/predict/PredictionResult";
import ModelInfoCard from "../components/predict/ModelInfoCard";

export default function Predict() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePredict = async (formData) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetchPrediction(formData);
      setResult(res);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Prediction failed. Make sure the ML model is trained."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Crime Prediction</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form + Result */}
        <div className="space-y-6">
          <PredictionForm onPredict={handlePredict} loading={loading} />
          <PredictionResult result={result} error={error} />
        </div>

        {/* Right: Model Info */}
        <div>
          <ModelInfoCard />
        </div>
      </div>
    </div>
  );
}
