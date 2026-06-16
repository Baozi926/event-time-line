export const CATEGORY_LABELS: Record<string, string> = {
  politics: '政治',
  disaster: '灾害',
  conflict: '冲突',
  tech: '科技',
  economy: '财经',
  society: '社会',
  health: '健康',
  environment: '环境',
  sports: '运动',
  rss: 'RSS',
  tracked: '关注',
};

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

const regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });

export function countryLabel(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: '英语',
  zh: '中文',
  ar: '阿拉伯语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
  ja: '日语',
  ko: '韩语',
};

export function languageLabel(code: string): string {
  const base = code.slice(0, 2).toLowerCase();
  return LANGUAGE_LABELS[base] ?? code.toUpperCase();
}
