import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function SummaryCard({ label, value, trend, badge, small, loading }) {
  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
        <div className="h-3 w-20 bg-white/10 rounded mb-3" />
        <div className="h-8 w-28 bg-white/10 rounded" />
      </div>
    );
  }

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span
          className={`font-bold text-white ${small ? "text-sm leading-tight" : "text-2xl"}`}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {TrendIcon && (
          <TrendIcon
            size={16}
            className={trend === "up" ? "text-red-400" : "text-green-400"}
          />
        )}
      </div>
      {badge && (
        <span
          className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
          style={{ backgroundColor: badge.color + "30", color: badge.color }}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}
