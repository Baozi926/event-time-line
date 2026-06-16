import {
  GDELT_CATEGORY_LABELS,
  HOT_TREND_PLATFORMS,
} from '@event-time-line/shared';

const HOT_TREND_LABELS = Object.fromEntries(
  HOT_TREND_PLATFORMS.map((p) => [p.id, p.name]),
);

export const CATEGORY_LABELS: Record<string, string> = {
  ...GDELT_CATEGORY_LABELS,
  ...HOT_TREND_LABELS,
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
