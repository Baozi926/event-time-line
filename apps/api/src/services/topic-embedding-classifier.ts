import { query } from '@event-time-line/database';
import {
  classifyTextTopicsByEmbedding,
  classifyTopicsByEmbeddingSimilarity,
  createEmbeddings,
  getTopicEmbeddingVectors,
  parsePgVector,
  type TopicClassificationResult,
} from '@event-time-line/shared';
import {
  readDataSourcesSettings,
  readEmbeddingApiKey,
} from './data-sources-settings.js';

async function loadEventVector(
  eventId: string,
  fallbackText: string,
): Promise<number[] | null> {
  const { settings } = await readDataSourcesSettings();
  if (!settings.embedding.enabled) return null;

  const apiKey =
    settings.embedding.provider === 'api' ? await readEmbeddingApiKey() : null;
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
  const { settings } = await readDataSourcesSettings();
  if (!settings.embedding.enabled) return [];

  const apiKey =
    settings.embedding.provider === 'api' ? await readEmbeddingApiKey() : null;
  if (settings.embedding.provider === 'api' && !apiKey) return [];

  const topicVectors = await getTopicEmbeddingVectors(settings.embedding, apiKey);
  if (!topicVectors) return [];

  const eventVector = await loadEventVector(
    eventId,
    `${title} ${summary ?? ''}`.trim(),
  );
  if (!eventVector) return [];

  const minSimilarity = Math.min(
    settings.embedding.minSimilarity,
    0.48,
  );

  return classifyTopicsByEmbeddingSimilarity(
    eventVector,
    topicVectors,
    minSimilarity,
  );
}

export async function classifyTextByEmbedding(
  text: string,
): Promise<TopicClassificationResult[]> {
  const { settings } = await readDataSourcesSettings();
  if (!settings.embedding.enabled) return [];

  const apiKey =
    settings.embedding.provider === 'api' ? await readEmbeddingApiKey() : null;
  if (settings.embedding.provider === 'api' && !apiKey) return [];

  return classifyTextTopicsByEmbedding(
    text,
    settings.embedding,
    apiKey,
    Math.min(settings.embedding.minSimilarity, 0.48),
  );
}
