import {
  TREND_RADAR_BUILTIN_RSS,
  TREND_RADAR_RECOMMENDED_RSS,
  type DefaultRssFeed,
} from './trend-radar-rss.js';

export const GDELT_CATEGORIES: Record<string, string> = {
  politics:
    '("election" OR "government" OR "parliament" OR "president" OR "coup" OR "sanctions" OR "diplomatic summit")',
  disaster:
    '("earthquake" OR "flood" OR "hurricane" OR "wildfire" OR "tsunami" OR "volcano" OR "drought" OR "cyclone")',
  conflict:
    '("war" OR "military" OR "attack" OR "ceasefire" OR "airstrike" OR "missile strike" OR "bombing" OR "troops mobilization" OR "piracy")',
  tech:
    '("artificial intelligence" OR "cyber attack" OR "data breach" OR "ransomware" OR "malware")',
  economy:
    '("market crash" OR "recession" OR "trade war" OR "inflation" OR "commodity crisis" OR "food shortage")',
  society:
    '("protest" OR "demonstration" OR "riot" OR "unrest" OR "kidnapping" OR "cartel" OR "crime")',
  health:
    '("pandemic" OR "outbreak" OR "epidemic" OR "health emergency")',
  environment:
    '("climate change" OR "pollution" OR "environmental disaster" OR "deforestation")',
  sports:
    '("Olympics" OR "World Cup" OR "championship" OR "tournament" OR "football match" OR "basketball" OR "tennis" OR "Formula One" OR "athlete" OR "sporting event")',
  // Regional hotspots — free alternative to Valyu threat queries
  conflict_ukraine:
    '("Ukraine" OR "Russia" OR "frontline" OR "counteroffensive" OR "Zelenskyy")',
  conflict_gaza:
    '("Gaza" OR "Hamas" OR "ceasefire" OR "Israel" OR "West Bank")',
  conflict_redsea:
    '("Houthi" OR "Red Sea" OR "Yemen" OR "shipping attack")',
  conflict_sudan:
    '("Sudan" OR "Khartoum" OR "RSF" OR "civil war")',
  conflict_taiwan:
    '("Taiwan" OR "Taiwan Strait" OR "military exercise")',
  conflict_dprk:
    '("North Korea" OR "ballistic missile" OR "DPRK")',
  conflict_nuclear:
    '("nuclear threat" OR "ballistic missile test" OR "ICBM")',
};

/** International wire / broadcast — core event coverage. */
const CORE_WORLD_RSS_FEEDS: DefaultRssFeed[] = [
  {
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    domain: 'bbc.co.uk',
    language: 'en',
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    domain: 'aljazeera.com',
    language: 'en',
  },
  {
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    domain: 'theguardian.com',
    language: 'en',
  },
  {
    name: 'DW News',
    url: 'https://rss.dw.com/xml/rss-en-world',
    domain: 'dw.com',
    language: 'en',
  },
  {
    name: 'France 24',
    url: 'https://www.france24.com/en/rss',
    domain: 'france24.com',
    language: 'en',
  },
  {
    name: 'NPR World',
    url: 'https://feeds.npr.org/1004/rss.xml',
    domain: 'npr.org',
    language: 'en',
  },
];

function mergeRssFeeds(...groups: DefaultRssFeed[][]): DefaultRssFeed[] {
  const seen = new Set<string>();
  const merged: DefaultRssFeed[] = [];
  for (const group of groups) {
    for (const feed of group) {
      if (seen.has(feed.url)) continue;
      seen.add(feed.url);
      merged.push(feed);
    }
  }
  return merged;
}

/** Default RSS feeds — seeded into DB on first run; Worker falls back if table is empty. */
export const DEFAULT_RSS_FEEDS = mergeRssFeeds(
  CORE_WORLD_RSS_FEEDS,
  TREND_RADAR_BUILTIN_RSS,
  TREND_RADAR_RECOMMENDED_RSS,
);

/** @deprecated Use DEFAULT_RSS_FEEDS or load from DB */
export const RSS_FEEDS = DEFAULT_RSS_FEEDS;

export const MAX_RSS_FEEDS = 50;

export const PROMOTE_THRESHOLDS = {
  minSourceCount: 3,
  minArticleCount24h: 5,
  minHeatScore: 35,
};

export const HEAT_WEIGHTS = {
  sourceDiversity: 0.3,
  articleVelocity: 0.25,
  recencyDecay: 0.2,
  sourceTier: 0.15,
  geographicSpread: 0.1,
};
