import { query } from '@event-time-line/database';
import {
  classifyTextTopicsByEmbedding,
  classifyTopicsByEmbeddingSimilarity,
  createEmbeddings,
  getTopicEmbeddingVectors,
  parsePgVector,
  type TopicClassificationResult,
} from '@event-time-line/shared';
import { loadDataSourcesSettings } from './data-sources-settings.js';
import { loadEmbeddingApiKey } from './event-embeddings.js';

async function loadEventVector(
  eventId: string,
  fallbackText: string,
): Promise<number[] | null> {
  const { settings } = await loadDataSourcesSettings();
  if (!settings.embedding.enabled) return null;

  const apiKey =
    settings.embedding.provider === 'api' ? await loadEmbeddingApiKey() : null;
  if (settings.embedding.provider === 'api' && !apiKey) return null;

  const stored = await query<{ embedding: unknown }>(
    `SELECT embedding::text AS embedding FROM events WHERE id = $1 AND embedding IS NOT NULL`,
    [eventId],
  );
  const parsed = parsePgVector(stored.rows[0]?.embedding);
  if (parsed) return parsed;

  const vectors = await createEmbeddings(
    [fallbackText.slice(0, 300)],
    settings.embedding,
    apiKey,
  );
  return vectors?.[0] ?? null;
}

export async function classifyEventTopicsByEmbedding(
  eventId: string,
  title: string,
  summary?: string | null,
): Promise<TopicClassificationResult[]> {
  const { settings } = await loadDataSourcesSettings();
  if (!settings.embedding.enabled) return [];

  const apiKey =
    settings.embedding.provider === 'api' ? await loadEmbeddingApiKey() : null;
  if (settings.embedding.provider === 'api' && !apiKey) return [];

  const topicVectors = await getTopicEmbeddingVectors(settings.embedding, apiKey);
  if (!topicVectors) return [];

  const eventVector = await loadEventVector(
    eventId,
    `${title} ${summary ?? ''}`.trim(),
  );
  if (!eventVector) return [];

  return classifyTopicsByEmbeddingSimilarity(
    eventVector,
    topicVectors,
    Math.min(settings.embedding.minSimilarity, 0.48),
  );
}

export async function classifyTextByEmbedding(
  text: string,
): Promise<TopicClassificationResult[]> {
  const { settings } = await loadDataSourcesSettings();
  if (!settings.embedding.enabled) return [];

  const apiKey =
    settings.embedding.provider === 'api' ? await loadEmbeddingApiKey() : null;
  if (settings.embedding.provider === 'api' && !apiKey) return [];

  return classifyTextTopicsByEmbedding(
    text,
    settings.embedding,
    apiKey,
    Math.min(settings.embedding.minSimilarity, 0.48),
  );
}
