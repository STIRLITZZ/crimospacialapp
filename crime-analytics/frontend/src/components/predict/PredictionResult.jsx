import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

export default function PredictionResult({ result, error }) {
  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Prediction Result</h3>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Prediction Result</h3>
        <p className="text-gray-500 text-sm">
          Fill in the form and click "Predict" to see results.
        </p>
      </div>
    );
  }

  const confidence = result.confidence || 0;
  const confPct = (confidence * 100).toFixed(1);
  const topProbs = (result.top_probabilities || []).map((p) => ({
    name: p.crime_type?.length > 20 ? p.crime_type.slice(0, 18) + "..." : p.crime_type,
    probability: parseFloat((p.probability * 100).toFixed(1)),
    full: p.crime_type,
  }));

  // Feature contributions
  const contributions = (result.feature_contributions || [])
    .filter((c) => c.importance !== 0)
    .slice(0, 12)
    .map((c) => ({
      name: c.feature,
      importance: parseFloat((c.importance * 100).toFixed(2)),
    }));

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
      <h3 className="text-white font-semibold">Prediction Result</h3>

      {/* Predicted type */}
      <div>
        <p className="text-gray-400 text-xs uppercase mb-1">Predicted Crime Type</p>
        <p className="text-2xl font-bold text-blue-400">
          {result.predicted_crime_type}
        </p>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-gray-400 text-xs uppercase">Confidence</p>
          <span className="text-white font-mono text-sm">{confPct}%</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, confidence * 100)}%`,
              backgroundColor:
                confidence >= 0.7
                  ? "#10b981"
                  : confidence >= 0.4
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Top 5 probabilities */}
      {topProbs.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase mb-2">
            Top Predicted Types
          </p>
          <ResponsiveContainer width="100%" height={topProbs.length * 36 + 20}>
            <BarChart
              data={topProbs}
              layout="vertical"
              margin={{ left: 5, right: 20 }}
            >
              <XAxis
                type="number"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                domain={[0, "auto"]}
                unit="%"
              />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                tick={{ fill: "#d1d5db", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val, name, props) => [
                  `${val}%`,
                  props.payload.full,
                ]}
              />
              <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                {topProbs.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? "#3b82f6" : "#6b7280"}
                    fillOpacity={1 - i * 0.15}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Feature contributions */}
      {contributions.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase mb-2">
            Feature Contributions
          </p>
          <ResponsiveContainer
            width="100%"
            height={contributions.length * 28 + 20}
          >
            <BarChart
              data={contributions}
              layout="vertical"
              margin={{ left: 5, right: 20 }}
            >
              <XAxis
                type="number"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                domain={[0, "auto"]}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={80}
                tick={{ fill: "#d1d5db", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val) => [`${val}%`, "Importance"]}
              />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {contributions.map((c, i) => (
                  <Cell
                    key={i}
                    fill={c.importance >= 0 ? "#ef4444" : "#10b981"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-gray-600 text-[10px] mt-1">
            Higher values indicate stronger influence on prediction.
          </p>
        </div>
      )}
    </div>
  );
}
