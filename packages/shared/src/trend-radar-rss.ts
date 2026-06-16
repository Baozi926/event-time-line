/**
 * Curated RSS feeds aligned with TrendRadar defaults and its README references
 * (awesome-rss-feeds / awesome-tech-rss). Verified parseable from worker network.
 *
 * @see https://github.com/sansan0/TrendRadar/blob/master/config/config.yaml
 * @see https://github.com/plenaryapp/awesome-rss-feeds
 */
export interface DefaultRssFeed {
  name: string;
  url: string;
  domain: string;
  language: string;
}

/** Built into TrendRadar config.yaml (enabled by default there). */
export const TREND_RADAR_BUILTIN_RSS: DefaultRssFeed[] = [
  {
    name: 'Hacker News',
    url: 'https://hnrss.org/frontpage',
    domain: 'news.ycombinator.com',
    language: 'en',
  },
  {
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    domain: 'finance.yahoo.com',
    language: 'en',
  },
];

/**
 * Extra feeds from TrendRadar's awesome-rss-feeds picks + Chinese finance/media
 * (华尔街见闻 mirrors TrendRadar hot-list platform; 新华网/中新网补国内时政国际).
 */
export const TREND_RADAR_RECOMMENDED_RSS: DefaultRssFeed[] = [
  // --- World / business (awesome-rss-feeds «News») ---
  {
    name: 'CNBC International',
    url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html',
    domain: 'cnbc.com',
    language: 'en',
  },
  {
    name: 'Sky News World',
    url: 'http://feeds.skynews.com/feeds/rss/world.xml',
    domain: 'news.sky.com',
    language: 'en',
  },
  {
    name: 'AP Top News',
    url: 'https://rsshub.rssforever.com/apnews/topics/apf-topnews',
    domain: 'apnews.com',
    language: 'en',
  },
  // --- Tech (awesome-tech-rss style) ---
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    domain: 'techcrunch.com',
    language: 'en',
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    domain: 'arstechnica.com',
    language: 'en',
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    domain: 'theverge.com',
    language: 'en',
  },
  // --- China (complements NewsNow hot-trend platforms) ---
  {
    name: '新华网时政',
    url: 'http://www.xinhuanet.com/politics/news_politics.xml',
    domain: 'xinhuanet.com',
    language: 'zh',
  },
  {
    name: '中国新闻网国际',
    url: 'https://www.chinanews.com.cn/rss/world.xml',
    domain: 'chinanews.com.cn',
    language: 'zh',
  },
  {
    name: '华尔街见闻热门',
    url: 'https://rsshub.rssforever.com/wallstreetcn/hot',
    domain: 'wallstreetcn.com',
    language: 'zh',
  },
];
