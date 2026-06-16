/**
 * Hot-trend platforms via NewsNow API (same stack as TrendRadar).
 * @see https://github.com/ourongxing/newsnow
 * @see https://github.com/sansan0/TrendRadar
 */
export interface HotTrendPlatform {
  id: string;
  name: string;
  /** Primary domain for HTTPS link safety checks (supports subdomains). */
  expectedDomain: string;
  language: string;
  countryCode?: string;
}

/** Default NewsNow API endpoint used by TrendRadar. */
export const DEFAULT_NEWSNOW_API_URL = 'https://newsnow.busiyi.world/api/s';

/**
 * Platforms aligned with TrendRadar defaults — Chinese news/social hot lists.
 * Self-host newsnow and set NEWSNOW_API_URL to use your own instance.
 */
export const HOT_TREND_PLATFORMS: HotTrendPlatform[] = [
  { id: 'weibo', name: '微博热搜', expectedDomain: 'weibo.com', language: 'zh', countryCode: 'CN' },
  { id: 'zhihu', name: '知乎热榜', expectedDomain: 'zhihu.com', language: 'zh', countryCode: 'CN' },
  { id: 'thepaper', name: '澎湃新闻', expectedDomain: 'thepaper.cn', language: 'zh', countryCode: 'CN' },
  { id: 'toutiao', name: '今日头条', expectedDomain: 'toutiao.com', language: 'zh', countryCode: 'CN' },
  { id: 'baidu', name: '百度热搜', expectedDomain: 'baidu.com', language: 'zh', countryCode: 'CN' },
  { id: 'bilibili-hot-search', name: 'B站热搜', expectedDomain: 'bilibili.com', language: 'zh', countryCode: 'CN' },
  { id: 'wallstreetcn-hot', name: '华尔街见闻', expectedDomain: 'wallstreetcn.com', language: 'zh', countryCode: 'CN' },
  { id: 'cls-hot', name: '财联社', expectedDomain: 'cls.cn', language: 'zh', countryCode: 'CN' },
  { id: 'ifeng', name: '凤凰网', expectedDomain: 'ifeng.com', language: 'zh', countryCode: 'CN' },
  { id: 'douyin', name: '抖音热榜', expectedDomain: 'douyin.com', language: 'zh', countryCode: 'CN' },
];

export const HOT_TREND_REQUEST_INTERVAL_MS = 1200;
