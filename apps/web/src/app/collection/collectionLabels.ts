export const RUN_TYPE_LABELS: Record<string, string> = {
  fetch_all: '全量采集',
  fetch_gdelt: 'GDELT 分类',
  fetch_rss: 'RSS 订阅',
  fetch_hot_trend: '热榜采集',
  fetch_valyu: 'Valyu 新闻',
  fetch_usgs: 'USGS 地震',
  fetch_tracked: '关注事件',
  tracked: '关注事件',
  snapshot: '每日快照',
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  gdelt_doc: 'GDELT',
  rss: 'RSS',
  hot_trend: '热榜',
  valyu: 'Valyu',
  usgs_earthquake: 'USGS 地震',
  mixed: '混合',
};

export const STATUS_STYLES: Record<string, string> = {
  running: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200',
  failed: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200',
  skipped: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200',
};

export const STATUS_LABELS: Record<string, string> = {
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  skipped: '已跳过',
};

export const GDELT_CATEGORY_LABELS: Record<string, string> = {
  politics: '政治',
  disaster: '灾害',
  conflict: '冲突',
  tech: '科技',
  economy: '经济',
  society: '社会',
  health: '健康',
  environment: '环境',
  sports: '体育',
  conflict_ukraine: '乌克兰',
  conflict_gaza: '加沙',
  conflict_redsea: '红海',
  conflict_sudan: '苏丹',
  conflict_taiwan: '台湾海峡',
  conflict_dprk: '朝鲜',
  conflict_nuclear: '核威胁',
};

export function gdeltCategoryLabel(category: string) {
  return GDELT_CATEGORY_LABELS[category] ?? category;
}

export function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN');
}

export function formatDuration(startedAt: string, finishedAt?: string) {
  if (!finishedAt) return '—';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}
