import { clampHeatScore, heatVisual } from '@/lib/heatVisual';

export function HeatBar({
  score,
  compact = false,
  showLabel = true,
}: {
  score: number;
  compact?: boolean;
  showLabel?: boolean;
}) {
  const pct = clampHeatScore(score);
  const heat = heatVisual(score);

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-[11px] font-semibold text-slate-400">热度</span>
      )}
      <div
        className={`overflow-hidden rounded-full ring-1 ${heat.trackClass} ${
          compact ? 'h-1.5 w-14' : 'h-2 w-20'
        }`}
      >
        <div
          className={`h-full rounded-full transition-all ${heat.fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-black tabular-nums ${heat.scoreClass}`}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}
