/** User-subscribable and classifiable topic definitions. */

export interface TopicDefinition {
  slug: string;
  name: string;
  nameEn: string;
  icon?: string;
  /** Short description for LLM classification */
  description: string;
  /** GDELT category key when collected via GDELT */
  gdeltCategoryKey?: string;
  /** Keywords for text matching fallback (lowercase) */
  keywords: string[];
  /** Aliases users may type when subscribing */
  aliases?: string[];
}

export const AI_TOPIC_KEYWORDS = [
  'artificial intelligence',
  'large language model',
  'generative ai',
  'machine learning',
  'deep learning',
  'neural network',
  'chatgpt',
  'openai',
  'anthropic',
  'claude',
  'gemini',
  'llm',
  'gpt-4',
  'gpt-5',
  'sora',
  'copilot',
  '人工智能',
  '大模型',
  '生成式',
  '深度学习',
  '机器学习',
  'ai agent',
  'ai 智能体',
] as const;

export const AI_GDELT_QUERY =
  '("artificial intelligence" OR "large language model" OR "generative AI" OR "ChatGPT" OR "OpenAI" OR "人工智能" OR "大模型" OR "生成式AI" OR "machine learning" OR "deep learning")';

export const TOPIC_DEFINITIONS: Record<string, TopicDefinition> = {
  ai: {
    slug: 'ai',
    name: '人工智能',
    nameEn: 'AI',
    description: '人工智能、大模型、生成式 AI、机器学习、AI 公司与产品',
    gdeltCategoryKey: 'ai',
    keywords: [...AI_TOPIC_KEYWORDS],
    aliases: ['ai', '人工智能', '大模型', '生成式ai'],
  },
  politics: {
    slug: 'politics',
    name: '政治',
    nameEn: 'Politics',
    description: '政府、选举、政策、外交、政党与政治人物',
    keywords: ['election', 'parliament', 'president', 'government', 'policy', 'diplomacy', '政治', '选举', '政府', '外交'],
    aliases: ['政治', 'politics'],
  },
  disaster: {
    slug: 'disaster',
    name: '灾害',
    nameEn: 'Disaster',
    description: '地震、洪水、台风、野火等自然灾害及救灾',
    gdeltCategoryKey: 'disaster',
    keywords: ['earthquake', 'flood', 'typhoon', 'wildfire', 'tsunami', 'hurricane', '地震', '洪水', '台风', '灾害'],
    aliases: ['灾害', 'disaster', '地震'],
  },
  conflict: {
    slug: 'conflict',
    name: '冲突',
    nameEn: 'Conflict',
    description: '战争、军事冲突、袭击、武装对抗',
    gdeltCategoryKey: 'conflict',
    keywords: ['war', 'military', 'attack', 'strike', 'conflict', 'invasion', '战争', '军事', '冲突', '袭击'],
    aliases: ['冲突', 'conflict', '军事', '战争'],
  },
  economy: {
    slug: 'economy',
    name: '财经',
    nameEn: 'Economy',
    description: '宏观经济、金融市场、央行、股市、贸易与货币政策',
    keywords: ['stock market', 'fed', 'inflation', 'gdp', 'trade', 'ipo', '财经', '股市', '央行', '通胀', '经济'],
    aliases: ['财经', 'economy', '金融', '股市'],
  },
  tech: {
    slug: 'tech',
    name: '科技',
    nameEn: 'Technology',
    description: '科技公司、产品发布、半导体、互联网与硬件（不含纯 AI 主题）',
    keywords: ['semiconductor', 'chip', 'iphone', 'android', 'startup', 'spacex', '科技', '半导体', '芯片', '互联网'],
    aliases: ['科技', 'tech', '半导体', '芯片'],
  },
  health: {
    slug: 'health',
    name: '健康',
    nameEn: 'Health',
    description: '公共卫生、疫情、医疗、药品与医院',
    keywords: ['covid', 'vaccine', 'hospital', 'disease', 'health', '医疗', '健康', '疫情', '疫苗'],
    aliases: ['健康', 'health', '医疗'],
  },
  society: {
    slug: 'society',
    name: '社会',
    nameEn: 'Society',
    description: '社会事件、民生、教育、犯罪与公共议题',
    keywords: ['crime', 'education', 'protest', 'housing', '社会', '民生', '教育', '犯罪'],
    aliases: ['社会', 'society'],
  },
  environment: {
    slug: 'environment',
    name: '环境',
    nameEn: 'Environment',
    description: '气候变化、环保、碳排放、能源转型',
    keywords: ['climate change', 'carbon', 'renewable', 'pollution', '环境', '气候', '碳排放', '环保'],
    aliases: ['环境', 'environment', '气候'],
  },
  sports: {
    slug: 'sports',
    name: '体育',
    nameEn: 'Sports',
    description: '体育赛事、运动员、奥运、职业联赛与电竞（KPL/LPL 等）',
    keywords: [
      'olympics',
      'football',
      'nba',
      'world cup',
      'kpl',
      'lpl',
      'esports',
      'e-sports',
      '体育',
      '奥运',
      '足球',
      '比赛',
      '联赛',
      '赛季',
      '夏季赛',
      '春季赛',
      '电竞',
      '王者荣耀',
      '英雄联盟',
      '英超',
      'cba',
      'f1',
    ],
    aliases: ['体育', 'sports', '电竞'],
  },
  culture: {
    slug: 'culture',
    name: '文化',
    nameEn: 'Culture',
    description: '娱乐、影视、音乐、艺术与文化产业',
    keywords: ['movie', 'music', 'film', 'entertainment', '文化', '娱乐', '电影', '音乐'],
    aliases: ['文化', 'culture', '娱乐'],
  },
};

export const CLASSIFIABLE_TOPIC_SLUGS = Object.keys(TOPIC_DEFINITIONS);

export const SUBSCRIBABLE_TOPIC_SLUGS = CLASSIFIABLE_TOPIC_SLUGS;

export const MIN_TOPIC_CLASSIFICATION_CONFIDENCE = 0.5;

export interface TopicClassificationResult {
  slug: string;
  confidence: number;
  reason: string;
}

export function getTopicDefinition(slug: string): TopicDefinition | undefined {
  return TOPIC_DEFINITIONS[slug];
}

export function textMatchesTopic(slug: string, text: string): boolean {
  const def = TOPIC_DEFINITIONS[slug];
  if (!def) return false;
  const lower = text.toLowerCase();
  return def.keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/** Returns topic slugs matched by text content. */
export function matchTopicsFromText(text: string): string[] {
  return CLASSIFIABLE_TOPIC_SLUGS.filter((slug) => textMatchesTopic(slug, text));
}

/** Category hint that directly maps to a topic slug. */
export function categoryHintMatchesTopic(slug: string, categoryHint?: string | null): boolean {
  const def = TOPIC_DEFINITIONS[slug];
  if (!def) return false;
  if (categoryHint === slug) return true;
  if (def.gdeltCategoryKey && categoryHint === def.gdeltCategoryKey) return true;
  return false;
}

export function eventMatchesTopic(
  slug: string,
  title: string,
  summary?: string | null,
  categoryHint?: string | null,
): boolean {
  if (categoryHintMatchesTopic(slug, categoryHint)) return true;
  return textMatchesTopic(slug, `${title} ${summary ?? ''}`);
}

/** Map a user keyword to a known topic slug, if possible. */
export function resolveKeywordToTopicSlug(normalizedKeyword: string): string | null {
  const normalized = normalizedKeyword.trim().toLowerCase();
  if (!normalized) return null;

  if (TOPIC_DEFINITIONS[normalized]) return normalized;

  for (const def of Object.values(TOPIC_DEFINITIONS)) {
    if (def.name.toLowerCase() === normalized) return def.slug;
    if (def.nameEn.toLowerCase() === normalized) return def.slug;
    if (def.aliases?.some((alias) => alias.toLowerCase() === normalized)) return def.slug;
  }

  return null;
}

export function listClassifiableTopicsForPrompt(): Array<{
  slug: string;
  name: string;
  description: string;
}> {
  return CLASSIFIABLE_TOPIC_SLUGS.map((slug) => {
    const def = TOPIC_DEFINITIONS[slug];
    return {
      slug: def.slug,
      name: `${def.name} / ${def.nameEn}`,
      description: def.description,
    };
  });
}
