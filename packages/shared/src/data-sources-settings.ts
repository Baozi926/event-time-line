import { GDELT_CATEGORIES } from './constants.js';
import {
  DEFAULT_NEWSNOW_API_URL,
  HOT_TREND_PLATFORMS,
  HOT_TREND_REQUEST_INTERVAL_MS,
} from './hot-trend-platforms.js';
import { VALYU_THREAT_QUERIES } from './threat-queries.js';

export const HOT_TREND_FETCH_INTERVAL_OPTIONS = [30, 60, 120, 240] as const;
export type HotTrendFetchIntervalMinutes =
  (typeof HOT_TREND_FETCH_INTERVAL_OPTIONS)[number];

export const DATA_SOURCES_SETTINGS_KEY = 'data_sources';

export const GDELT_CATEGORY_LABELS: Record<string, string> = {
  politics: '政治',
  disaster: '灾害',
  conflict: '冲突',
  tech: '科技',
  economy: '经济',
  society: '社会',
  health: '健康',
  environment: '环境',
  sports: '运动',
  conflict_ukraine: '乌克兰',
  conflict_gaza: '加沙',
  conflict_redsea: '红海',
  conflict_sudan: '苏丹',
  conflict_taiwan: '台海',
  conflict_dprk: '朝鲜',
  conflict_nuclear: '核威胁',
};

export interface GdeltCategoryConfig {
  key: string;
  enabled: boolean;
  query: string;
}

export interface HotTrendPlatformConfig {
  id: string;
  name: string;
  expectedDomain: string;
  language: string;
  countryCode?: string;
  enabled: boolean;
}

export interface ValyuQueryConfig {
  id: string;
  query: string;
  categoryHint: string;
  enabled: boolean;
}

export interface GdeltSourceSettings {
  enabled: boolean;
  apiUrl: string;
  categoryDelayMs: number;
  categories: GdeltCategoryConfig[];
}

export interface HotTrendSourceSettings {
  enabled: boolean;
  apiUrl: string;
  /** 各平台之间的请求间隔（毫秒） */
  requestIntervalMs: number;
  /** 热榜整体采集调度间隔（分钟） */
  fetchIntervalMinutes: number;
  platforms: HotTrendPlatformConfig[];
}

export interface ValyuSourceSettings {
  enabled: boolean;
  queryDelayMs: number;
  maxResults: number;
  lookbackDays: number;
  queries: ValyuQueryConfig[];
}

export interface UsgsSourceSettings {
  enabled: boolean;
  feedUrl: string;
  minMagnitude: number;
}

export interface DataSourcesSettings {
  gdelt: GdeltSourceSettings;
  hotTrend: HotTrendSourceSettings;
  valyu: ValyuSourceSettings;
  usgs: UsgsSourceSettings;
}

export interface DataSourcesSettingsResponse {
  settings: DataSourcesSettings;
  updatedAt: string;
  valyuApiKeyConfigured: boolean;
}

const DEFAULT_GDELT_API_URL =
  'https://api.gdeltproject.org/api/v2/doc/doc';
const DEFAULT_USGS_FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

function buildDefaultGdeltCategories(): GdeltCategoryConfig[] {
  return Object.entries(GDELT_CATEGORIES).map(([key, query]) => ({
    key,
    enabled: true,
    query,
  }));
}

function buildDefaultHotTrendPlatforms(): HotTrendPlatformConfig[] {
  return HOT_TREND_PLATFORMS.map((platform) => ({
    id: platform.id,
    name: platform.name,
    expectedDomain: platform.expectedDomain,
    language: platform.language,
    countryCode: platform.countryCode,
    enabled: true,
  }));
}

function buildDefaultValyuQueries(): ValyuQueryConfig[] {
  return VALYU_THREAT_QUERIES.map((entry, index) => ({
    id: `valyu-${index}`,
    query: entry.query,
    categoryHint: entry.categoryHint,
    enabled: true,
  }));
}

export const DEFAULT_DATA_SOURCES_SETTINGS: DataSourcesSettings = {
  gdelt: {
    enabled: true,
    apiUrl: DEFAULT_GDELT_API_URL,
    categoryDelayMs: 12000,
    categories: buildDefaultGdeltCategories(),
  },
  hotTrend: {
    enabled: true,
    apiUrl: DEFAULT_NEWSNOW_API_URL,
    requestIntervalMs: HOT_TREND_REQUEST_INTERVAL_MS,
    fetchIntervalMinutes: 60,
    platforms: buildDefaultHotTrendPlatforms(),
  },
  valyu: {
    enabled: false,
    queryDelayMs: 2000,
    maxResults: 20,
    lookbackDays: 7,
    queries: buildDefaultValyuQueries(),
  },
  usgs: {
    enabled: true,
    feedUrl: DEFAULT_USGS_FEED_URL,
    minMagnitude: 4.5,
  },
};

function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseGdeltCategories(input: unknown): GdeltCategoryConfig[] | null {
  if (!Array.isArray(input)) return null;
  const categories: GdeltCategoryConfig[] = [];
  const seen = new Set<string>();

  for (const row of input) {
    if (!row || typeof row !== 'object') return null;
    const raw = row as Record<string, unknown>;
    const key = typeof raw.key === 'string' ? raw.key.trim() : '';
    const query = typeof raw.query === 'string' ? raw.query.trim() : '';
    if (!key || !query) return null;
    if (seen.has(key)) return null;
    seen.add(key);
    categories.push({
      key,
      enabled: raw.enabled !== false,
      query,
    });
  }

  return categories.length > 0 ? categories : null;
}

function parseHotTrendPlatforms(input: unknown): HotTrendPlatformConfig[] | null {
  if (!Array.isArray(input)) return null;
  const platforms: HotTrendPlatformConfig[] = [];
  const seen = new Set<string>();

  for (const row of input) {
    if (!row || typeof row !== 'object') return null;
    const raw = row as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const expectedDomain = typeof raw.expectedDomain === 'string'
      ? raw.expectedDomain.trim().toLowerCase()
      : '';
    const language = typeof raw.language === 'string'
      ? raw.language.trim().slice(0, 8)
      : 'zh';
    if (!id || !name || !expectedDomain) return null;
    if (seen.has(id)) return null;
    seen.add(id);
    const countryCode = typeof raw.countryCode === 'string'
      ? raw.countryCode.trim().toUpperCase().slice(0, 2)
      : undefined;
    platforms.push({
      id,
      name,
      expectedDomain,
      language,
      countryCode: countryCode || undefined,
      enabled: raw.enabled !== false,
    });
  }

  return platforms.length > 0 ? platforms : null;
}

function parseValyuQueries(input: unknown): ValyuQueryConfig[] | null {
  if (!Array.isArray(input)) return null;
  const queries: ValyuQueryConfig[] = [];
  const seen = new Set<string>();

  for (const row of input) {
    if (!row || typeof row !== 'object') return null;
    const raw = row as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const query = typeof raw.query === 'string' ? raw.query.trim() : '';
    const categoryHint = typeof raw.categoryHint === 'string'
      ? raw.categoryHint.trim()
      : '';
    if (!id || !query || !categoryHint) return null;
    if (seen.has(id)) return null;
    seen.add(id);
    queries.push({
      id,
      query,
      categoryHint,
      enabled: raw.enabled !== false,
    });
  }

  return queries.length > 0 ? queries : null;
}

export function parseDataSourcesSettings(
  input: unknown,
): DataSourcesSettings | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const gdeltRaw = raw.gdelt;
  const hotTrendRaw = raw.hotTrend;
  const valyuRaw = raw.valyu;
  const usgsRaw = raw.usgs;

  if (
    !gdeltRaw || typeof gdeltRaw !== 'object'
    || !hotTrendRaw || typeof hotTrendRaw !== 'object'
    || !valyuRaw || typeof valyuRaw !== 'object'
    || !usgsRaw || typeof usgsRaw !== 'object'
  ) {
    return null;
  }

  const gdeltObj = gdeltRaw as Record<string, unknown>;
  const hotTrendObj = hotTrendRaw as Record<string, unknown>;
  const valyuObj = valyuRaw as Record<string, unknown>;
  const usgsObj = usgsRaw as Record<string, unknown>;

  const apiUrl = typeof gdeltObj.apiUrl === 'string' ? gdeltObj.apiUrl.trim() : '';
  const categoryDelayMs = Number(gdeltObj.categoryDelayMs);
  const gdeltCategories = parseGdeltCategories(gdeltObj.categories);

  const hotTrendApiUrl = typeof hotTrendObj.apiUrl === 'string'
    ? hotTrendObj.apiUrl.trim()
    : '';
  const requestIntervalMs = Number(hotTrendObj.requestIntervalMs);
  const fetchIntervalMinutes = hotTrendObj.fetchIntervalMinutes !== undefined
    ? Number(hotTrendObj.fetchIntervalMinutes)
    : DEFAULT_DATA_SOURCES_SETTINGS.hotTrend.fetchIntervalMinutes;
  const hotTrendPlatforms = parseHotTrendPlatforms(hotTrendObj.platforms);

  const queryDelayMs = Number(valyuObj.queryDelayMs);
  const maxResults = Number(valyuObj.maxResults);
  const lookbackDays = Number(valyuObj.lookbackDays);
  const valyuQueries = parseValyuQueries(valyuObj.queries);

  const feedUrl = typeof usgsObj.feedUrl === 'string' ? usgsObj.feedUrl.trim() : '';
  const minMagnitude = Number(usgsObj.minMagnitude);

  if (
    !apiUrl || !isHttpsUrl(apiUrl)
    || !Number.isFinite(categoryDelayMs) || categoryDelayMs < 1000 || categoryDelayMs > 120000
    || !gdeltCategories
    || !hotTrendApiUrl || !isHttpsUrl(hotTrendApiUrl)
    || !Number.isFinite(requestIntervalMs) || requestIntervalMs < 200 || requestIntervalMs > 10000
    || !Number.isFinite(fetchIntervalMinutes)
    || !(HOT_TREND_FETCH_INTERVAL_OPTIONS as readonly number[]).includes(fetchIntervalMinutes)
    || !hotTrendPlatforms
    || !Number.isFinite(queryDelayMs) || queryDelayMs < 500 || queryDelayMs > 30000
    || !Number.isFinite(maxResults) || maxResults < 1 || maxResults > 50
    || !Number.isFinite(lookbackDays) || lookbackDays < 1 || lookbackDays > 30
    || !valyuQueries
    || !feedUrl || !isHttpsUrl(feedUrl)
    || !Number.isFinite(minMagnitude) || minMagnitude < 0 || minMagnitude > 10
  ) {
    return null;
  }

  return {
    gdelt: {
      enabled: gdeltObj.enabled !== false,
      apiUrl,
      categoryDelayMs,
      categories: gdeltCategories,
    },
    hotTrend: {
      enabled: hotTrendObj.enabled !== false,
      apiUrl: hotTrendApiUrl,
      requestIntervalMs,
      fetchIntervalMinutes,
      platforms: hotTrendPlatforms,
    },
    valyu: {
      enabled: valyuObj.enabled === true,
      queryDelayMs,
      maxResults,
      lookbackDays,
      queries: valyuQueries,
    },
    usgs: {
      enabled: usgsObj.enabled !== false,
      feedUrl,
      minMagnitude,
    },
  };
}

/** Merge saved settings with defaults so new categories/platforms/queries appear after upgrades. */
export function mergeDataSourcesSettings(
  parsed: DataSourcesSettings,
  defaults: DataSourcesSettings = DEFAULT_DATA_SOURCES_SETTINGS,
): DataSourcesSettings {
  const gdeltMap = new Map(parsed.gdelt.categories.map((c) => [c.key, c]));
  for (const def of defaults.gdelt.categories) {
    if (!gdeltMap.has(def.key)) {
      gdeltMap.set(def.key, def);
    }
  }

  const platformMap = new Map(parsed.hotTrend.platforms.map((p) => [p.id, p]));
  for (const def of defaults.hotTrend.platforms) {
    if (!platformMap.has(def.id)) {
      platformMap.set(def.id, def);
    }
  }

  const valyuMap = new Map(parsed.valyu.queries.map((q) => [q.id, q]));
  for (const def of defaults.valyu.queries) {
    if (!valyuMap.has(def.id)) {
      valyuMap.set(def.id, def);
    }
  }

  return {
    gdelt: {
      ...parsed.gdelt,
      categories: Array.from(gdeltMap.values()),
    },
    hotTrend: {
      ...parsed.hotTrend,
      fetchIntervalMinutes:
        parsed.hotTrend.fetchIntervalMinutes
        ?? defaults.hotTrend.fetchIntervalMinutes,
      platforms: Array.from(platformMap.values()),
    },
    valyu: {
      ...parsed.valyu,
      queries: Array.from(valyuMap.values()),
    },
    usgs: parsed.usgs,
  };
}

export function getEnabledHotTrendPlatforms(
  settings: HotTrendSourceSettings,
): HotTrendPlatformConfig[] {
  return settings.platforms.filter((platform) => platform.enabled);
}

export function getEnabledGdeltCategories(
  settings: GdeltSourceSettings,
): GdeltCategoryConfig[] {
  return settings.categories.filter((category) => category.enabled);
}

export function getEnabledValyuQueries(
  settings: ValyuSourceSettings,
): ValyuQueryConfig[] {
  return settings.queries.filter((query) => query.enabled);
}
