export function clampHeatScore(score: number): number {
  return Math.min(Math.max(score, 0), 100);
}

/** 热度条颜色：分数越高越升温，最高档进入红色，长度仍由分数百分比决定 */
export function heatVisual(score: number) {
  const pct = clampHeatScore(score);

  if (pct >= 85) {
    return {
      label: '爆',
      fillClass: 'bg-gradient-to-r from-orange-500 to-red-600',
      scoreClass: 'text-red-600',
      trackClass: 'bg-red-50 ring-red-100',
    };
  }
  if (pct >= 70) {
    return {
      label: '高',
      fillClass: 'bg-gradient-to-r from-amber-400 to-orange-500',
      scoreClass: 'text-orange-600',
      trackClass: 'bg-orange-50 ring-orange-100',
    };
  }
  if (pct >= 40) {
    return {
      label: '中',
      fillClass: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      scoreClass: 'text-amber-600',
      trackClass: 'bg-amber-50 ring-amber-100',
    };
  }
  if (pct >= 15) {
    return {
      label: '温',
      fillClass: 'bg-gradient-to-r from-brand-500 to-blue-400',
      scoreClass: 'text-brand-700',
      trackClass: 'bg-blue-50 ring-blue-100',
    };
  }
  return {
    label: '低',
    fillClass: 'bg-gradient-to-r from-slate-300 to-slate-400',
    scoreClass: 'text-slate-500',
    trackClass: 'bg-slate-100 ring-slate-200',
  };
}
