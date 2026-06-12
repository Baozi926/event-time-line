export const GDELT_CATEGORIES: Record<string, string> = {
  politics: '("election" OR "government" OR "parliament" OR "president")',
  disaster: '("earthquake" OR "flood" OR "hurricane" OR "wildfire" OR "tsunami")',
  conflict: '("war" OR "military" OR "attack" OR "ceasefire" OR "airstrike")',
  tech: '("artificial intelligence" OR "cyber attack" OR "data breach")',
  economy: '("market crash" OR "recession" OR "trade war" OR "inflation")',
};

export const RSS_FEEDS = [
  {
    name: 'BBC World',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    domain: 'bbc.co.uk',
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    domain: 'aljazeera.com',
  },
];

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
