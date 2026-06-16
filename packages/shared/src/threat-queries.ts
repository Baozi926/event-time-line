/** Valyu news search queries (natural language). Inspired by globalthreatmap. */
export const VALYU_THREAT_QUERIES: ReadonlyArray<{
  query: string;
  categoryHint: string;
}> = [
  { query: 'breaking news conflict military', categoryHint: 'conflict' },
  { query: 'geopolitical crisis tensions', categoryHint: 'conflict' },
  { query: 'protest demonstration unrest', categoryHint: 'society' },
  { query: 'natural disaster emergency', categoryHint: 'disaster' },
  { query: 'earthquake tsunami volcano eruption', categoryHint: 'disaster' },
  { query: 'hurricane typhoon cyclone storm', categoryHint: 'disaster' },
  { query: 'flooding wildfire drought extreme weather', categoryHint: 'disaster' },
  { query: 'terrorism attack security', categoryHint: 'conflict' },
  { query: 'cyber attack breach', categoryHint: 'tech' },
  { query: 'diplomatic summit sanctions', categoryHint: 'politics' },
  { query: 'shipping attack piracy maritime', categoryHint: 'conflict' },
  { query: 'kidnapping cartel violence crime', categoryHint: 'society' },
  { query: 'infrastructure dam power grid failure', categoryHint: 'society' },
  { query: 'food shortage commodity crisis', categoryHint: 'economy' },
  { query: 'missile strike airstrike bombing', categoryHint: 'conflict' },
  { query: 'military deployment troops mobilization', categoryHint: 'conflict' },
  { query: 'coup election interference political crisis', categoryHint: 'politics' },
  { query: 'nuclear threat ballistic missile test', categoryHint: 'conflict' },
  { query: 'Ukraine Russia frontline offensive counterattack', categoryHint: 'conflict' },
  { query: 'Israel Hamas Gaza ceasefire offensive', categoryHint: 'conflict' },
  { query: 'Yemen Houthi Red Sea shipping attacks', categoryHint: 'conflict' },
  { query: 'Sudan civil war RSF SAF Khartoum', categoryHint: 'conflict' },
  { query: 'Taiwan China military exercises strait', categoryHint: 'conflict' },
  { query: 'NATO military deployment buildup', categoryHint: 'conflict' },
  { query: 'North Korea missile launch provocation', categoryHint: 'conflict' },
  { query: 'pandemic outbreak health emergency', categoryHint: 'health' },
  { query: 'climate pollution environmental damage', categoryHint: 'environment' },
];
