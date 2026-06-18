import { createEmbeddings } from './embedding-client.js';
import type { EmbeddingSettings } from './embedding.js';
import {
  CLASSIFIABLE_TOPIC_SLUGS,
  getTopicDefinition,
  type TopicClassificationResult,
} from './topics.js';

/** Minimum cosine similarity to assign a topic via embedding. */
export const MIN_TOPIC_EMBEDDING_SIMILARITY = 0.42;

let cachedTopicVectors: Map<string, number[]> | null = null;
let cachedSettingsKey: string | null = null;

export function buildTopicEmbeddingText(slug: string): string {
  const def = getTopicDefinition(slug);
  if (!def) return slug;
  const sampleKeywords = def.keywords.slice(0, 12).join('、');
  return `${def.name}（${def.nameEn}）。${def.description}。相关词：${sampleKeywords}`;
}

export function buildAllTopicEmbeddingTexts(): Array<{ slug: string; text: string }> {
  return CLASSIFIABLE_TOPIC_SLUGS.map((slug) => ({
    slug,
    text: buildTopicEmbeddingText(slug),
  }));
}

export function parsePgVector(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    return value.every((n) => typeof n === 'number' && Number.isFinite(n))
      ? (value as number[])
      : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) return null;
  const nums = trimmed
    .slice(1, -1)
    .split(',')
    .map((part) => Number(part.trim()));
  if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

export function classifyTopicsByEmbeddingSimilarity(
  eventVector: number[],
  topicVectors: Map<string, number[]>,
  minSimilarity = MIN_TOPIC_EMBEDDING_SIMILARITY,
  maxTopics = 3,
): TopicClassificationResult[] {
  const results: TopicClassificationResult[] = [];

  for (const [slug, vector] of topicVectors) {
    const sim = cosineSimilarity(eventVector, vector);
    if (sim < minSimilarity) continue;

    const def = getTopicDefinition(slug);
    const pct = Math.round(sim * 100);
    results.push({
      slug,
      confidence: Math.min(0.95, sim),
      reason: `语义相似度 ${pct}%，与「${def?.name ?? slug}」主题相近`,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, maxTopics);
}

export async function getTopicEmbeddingVectors(
  settings: EmbeddingSettings,
  apiKey?: string | null,
): Promise<Map<string, number[]> | null> {
  const cacheKey = `${settings.provider}:${settings.local.baseUrl}:${settings.local.model}:${settings.api.baseUrl}:${settings.api.model}`;
  if (cachedTopicVectors && cachedSettingsKey === cacheKey) {
    return cachedTopicVectors;
  }

  const items = buildAllTopicEmbeddingTexts();
  const vectors = await createEmbeddings(
    items.map((item) => item.text),
    settings,
    apiKey,
  );
  if (!vectors) return null;

  cachedTopicVectors = new Map(
    items.map((item, index) => [item.slug, vectors[index]!]),
  );
  cachedSettingsKey = cacheKey;
  return cachedTopicVectors;
}

export async function classifyTextTopicsByEmbedding(
  text: string,
  settings: EmbeddingSettings,
  apiKey?: string | null,
  minSimilarity = MIN_TOPIC_EMBEDDING_SIMILARITY,
): Promise<TopicClassificationResult[]> {
  if (!settings.enabled) return [];

  const topicVectors = await getTopicEmbeddingVectors(settings, apiKey);
  if (!topicVectors) return [];

  const vectors = await createEmbeddings([text.slice(0, 300)], settings, apiKey);
  const eventVector = vectors?.[0];
  if (!eventVector) return [];

  const threshold = Math.min(minSimilarity, settings.minSimilarity);
  return classifyTopicsByEmbeddingSimilarity(eventVector, topicVectors, threshold);
}
