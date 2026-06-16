import type { RawArticle } from './types/index.js';

export const BLOCKED_ARTICLE_DOMAINS = [
  'wikipedia.org',
  'brighteon.com',
  'fortinet.com',
  'cisa.gov',
] as const;

const GENERIC_TITLE_PATTERNS: RegExp[] = [
  /\| topic$/i,
  /\| homeland security$/i,
  /\| fortinet$/i,
  /^natural disasters$/i,
  /^countering terrorism$/i,
  /^maritime piracy:/i,
  /^assessment of global/i,
  /^recent cyber attacks in \d{4}/i,
];

const BOILERPLATE_PATTERNS: RegExp[] = [
  /skip to (?:main |primary )?content/gi,
  /keyboard shortcuts?(?: for audio player)?/gi,
  /toggle navigation/gi,
  /sign (?:in|up|out)/gi,
  /subscribe(?:\s+now)?/gi,
  /newsletter/gi,
  /privacy policy/gi,
  /terms (?:of (?:service|use)|and conditions)/gi,
  /all rights reserved/gi,
  /read more/gi,
  /continue reading/gi,
  /advertisement/gi,
  /sponsored (?:content|by)/gi,
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  conflict: [
    'war', 'battle', 'fighting', 'combat', 'attack', 'invasion', 'troops',
    'missile', 'airstrike', 'ceasefire', 'terrorist', 'terrorism', 'militant',
    'piracy', 'hijack', 'houthi',
  ],
  society: [
    'protest', 'demonstration', 'riot', 'unrest', 'uprising', 'kidnapping',
    'murder', 'shooting', 'cartel', 'crime', 'infrastructure', 'blackout',
  ],
  disaster: [
    'earthquake', 'flood', 'hurricane', 'typhoon', 'tsunami', 'wildfire',
    'tornado', 'volcanic', 'landslide', 'disaster',
  ],
  politics: [
    'summit', 'treaty', 'diplomatic', 'embassy', 'sanctions', 'coup',
    'election', 'parliament', 'government', 'president',
  ],
  economy: [
    'economy', 'trade', 'tariff', 'inflation', 'recession', 'market',
    'commodity', 'food shortage', 'famine', 'food price',
  ],
  tech: [
    'cyber', 'hack', 'breach', 'malware', 'ransomware', 'data leak',
    'artificial intelligence', 'data breach',
  ],
  health: [
    'pandemic', 'epidemic', 'outbreak', 'virus', 'disease', 'covid',
    'health emergency', 'infection',
  ],
  environment: [
    'climate', 'pollution', 'environmental', 'emission', 'deforestation',
    'carbon', 'conservation',
  ],
  sports: [
    'olympics', 'world cup', 'championship', 'tournament', 'football',
    'soccer', 'basketball', 'tennis', 'formula one', 'athlete', 'medal',
    'sporting', 'match', 'league', 'coach', 'stadium',
  ],
};

/** Country / city names → ISO 3166-1 alpha-2 (subset for event-location inference). */
export const KNOWN_LOCATION_COUNTRY_CODES: Record<string, string> = {
  Ukraine: 'UA',
  Russia: 'RU',
  Gaza: 'PS',
  Israel: 'IL',
  Iran: 'IR',
  Syria: 'SY',
  Yemen: 'YE',
  Iraq: 'IQ',
  Lebanon: 'LB',
  Sudan: 'SD',
  Taiwan: 'TW',
  China: 'CN',
  'North Korea': 'KP',
  'South Korea': 'KR',
  Japan: 'JP',
  India: 'IN',
  Pakistan: 'PK',
  Afghanistan: 'AF',
  'United States': 'US',
  USA: 'US',
  'United Kingdom': 'GB',
  UK: 'GB',
  France: 'FR',
  Germany: 'DE',
  Turkey: 'TR',
  Brazil: 'BR',
  Mexico: 'MX',
  Venezuela: 'VE',
  Nigeria: 'NG',
  Ethiopia: 'ET',
  Somalia: 'SO',
  Egypt: 'EG',
  Libya: 'LY',
  Morocco: 'MA',
  Algeria: 'DZ',
  Kenya: 'KE',
  Congo: 'CD',
  DRC: 'CD',
  Myanmar: 'MM',
  Philippines: 'PH',
  Greece: 'GR',
  Indonesia: 'ID',
  Australia: 'AU',
  Canada: 'CA',
  'Saudi Arabia': 'SA',
  Qatar: 'QA',
  Kuwait: 'KW',
  Jordan: 'JO',
  'United Arab Emirates': 'AE',
  UAE: 'AE',
  Bahrain: 'BH',
  Poland: 'PL',
  Serbia: 'RS',
  Kosovo: 'XK',
  Belarus: 'BY',
  Colombia: 'CO',
  Argentina: 'AR',
  Chile: 'CL',
  Peru: 'PE',
};

export function cleanArticleText(text: string): string {
  let cleaned = text;
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

export function shouldSkipArticle(url: string, title: string): boolean {
  const lowerUrl = url.toLowerCase();
  if (BLOCKED_ARTICLE_DOMAINS.some((domain) => lowerUrl.includes(domain))) {
    return true;
  }
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export function classifyCategoryFromText(text: string): string {
  const lowerText = text.toLowerCase();
  let bestMatch = 'politics';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce(
      (acc, keyword) => acc + (lowerText.includes(keyword) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}

export function inferCountryFromText(text: string): string | undefined {
  for (const [name, code] of Object.entries(KNOWN_LOCATION_COUNTRY_CODES)) {
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) return code;
  }
  return undefined;
}

export function dedupeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'fbclid') {
        u.searchParams.delete(key);
      }
    }
    let normalized = u.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function titleFingerprint(title: string, country?: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .sort()
    .slice(0, 5)
    .join('|');
  return `${words}::${(country ?? '').toLowerCase()}`;
}

export function dedupeRawArticles(articles: RawArticle[]): RawArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const seenFingerprints = new Set<string>();
  const unique: RawArticle[] = [];

  for (const article of articles) {
    const urlKey = dedupeUrlKey(article.url);
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    const title = article.title.trim();
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);

    const fingerprint = titleFingerprint(title, article.country);
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);

    unique.push(article);
  }

  return unique;
}

export function prepareArticle(raw: RawArticle): RawArticle | null {
  const title = cleanArticleText(raw.title);
  if (!title || title.length < 8) return null;
  if (shouldSkipArticle(raw.url, title)) return null;

  const snippetSource = raw.snippet ?? title;
  const snippet = cleanArticleText(snippetSource).slice(0, 500);
  const fullText = `${title} ${snippet}`;

  const categoryHint =
    raw.categoryHint && raw.categoryHint !== 'rss'
      ? raw.categoryHint
      : classifyCategoryFromText(fullText);

  const country = raw.country ?? inferCountryFromText(fullText);

  return {
    ...raw,
    title,
    snippet: snippet || title.slice(0, 300),
    categoryHint,
    country,
  };
}

export function prepareArticlesForIngest(articles: RawArticle[]): RawArticle[] {
  const prepared = articles
    .map(prepareArticle)
    .filter((a): a is RawArticle => a !== null);
  return dedupeRawArticles(prepared);
}
