import HotspotPredictionCard from "../components/predict/HotspotPredictionCard";

export default function Predict() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Predictie hotspot-uri infractionale</h2>

      <HotspotPredictionCard />
    </div>
  );
}
