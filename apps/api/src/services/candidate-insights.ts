import { query } from '@event-time-line/database';
import type {
  CandidateEmbeddingInfo,
  CandidateSimilarItem,
  CandidateTopicClassification,
} from '@event-time-line/shared';
import {
  CLASSIFIABLE_TOPIC_SLUGS,
  getTopicDefinition,
  matchTopicsFromText,
  TOPIC_DEFINITIONS,
} from '@event-time-line/shared';
import { readDataSourcesSettings } from './data-sources-settings.js';
import { classifyEventTopicsByEmbedding } from './topic-embedding-classifier.js';
import type { TopicClassificationResult } from '@event-time-line/shared';

export async function loadEventTopicClassifications(
  eventId: string,
): Promise<CandidateTopicClassification[]> {
  const res = await query<{
    slug: string;
    name: string;
    name_en: string | null;
    confidence: string;
    classification_reason: string | null;
  }>(
    `SELECT t.slug, t.name, t.name_en, et.confidence::text, et.classification_reason
     FROM event_topics et
     JOIN topics t ON t.id = et.topic_id
     WHERE et.event_id = $1
     ORDER BY et.confidence DESC, t.sort_order ASC`,
    [eventId],
  );

  return res.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    confidence: Number(row.confidence),
    reason: row.classification_reason ?? undefined,
  }));
}

async function writeTopicClassifications(
  eventId: string,
  classifications: TopicClassificationResult[],
): Promise<void> {
  if (classifications.length === 0) return;

  let primarySlug: string | null = null;
  let primaryConfidence = -1;

  for (const item of classifications) {
    const topic = await query<{ id: string }>(
      `SELECT id FROM topics WHERE slug = $1`,
      [item.slug],
    );
    const topicId = topic.rows[0]?.id;
    if (!topicId) continue;

    await query(
      `INSERT INTO event_topics (event_id, topic_id, confidence, classification_reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, topic_id) DO UPDATE SET
         confidence = GREATEST(event_topics.confidence, EXCLUDED.confidence),
         classification_reason = COALESCE(EXCLUDED.classification_reason, event_topics.classification_reason)`,
      [eventId, topicId, item.confidence, item.reason],
    );

    if (item.confidence > primaryConfidence) {
      primaryConfidence = item.confidence;
      primarySlug = item.slug;
    }
  }

  if (primarySlug) {
    await query(
      `UPDATE events
       SET category_hint = $2, updated_at = NOW()
       WHERE id = $1
         AND (category_hint IS NULL OR category_hint = '' OR category_hint = $2)`,
      [eventId, primarySlug],
    );
  }
}

async function writeRuleBasedTopicClassifications(
  eventId: string,
  title: string,
  summary?: string | null,
  categoryHint?: string | null,
): Promise<boolean> {
  const text = `${title} ${summary ?? ''}`;
  const matchedSlugs = new Set(matchTopicsFromText(text));

  if (categoryHint && CLASSIFIABLE_TOPIC_SLUGS.includes(categoryHint)) {
    matchedSlugs.add(categoryHint);
  }

  if (matchedSlugs.size === 0) return false;

  const classifications = [...matchedSlugs].map((slug) => ({
    slug,
    confidence: 0.6,
    reason: '规则关键词匹配',
  }));

  await writeTopicClassifications(eventId, classifications);
  return true;
}

/** Load topics; if none exist, try rule-based classification from title/summary. */
export async function ensureEventTopicClassifications(
  eventId: string,
): Promise<CandidateTopicClassification[]> {
  const existing = await loadEventTopicClassifications(eventId);
  if (existing.length > 0) return existing;

  const eventRes = await query<{
    title: string;
    summary: string;
    category_hint: string | null;
  }>(
    `SELECT title, summary, category_hint FROM events WHERE id = $1`,
    [eventId],
  );
  const event = eventRes.rows[0];
  if (!event) return [];

  await writeRuleBasedTopicClassifications(
    eventId,
    event.title,
    event.summary,
    event.category_hint,
  );

  let topics = await loadEventTopicClassifications(eventId);
  if (topics.length > 0) return topics;

  const embeddingTopics = await classifyEventTopicsByEmbedding(
    eventId,
    event.title,
    event.summary,
  );
  if (embeddingTopics.length > 0) {
    await writeTopicClassifications(eventId, embeddingTopics);
    topics = await loadEventTopicClassifications(eventId);
  }

  return topics;
}

export async function loadEventEmbeddingInfo(
  eventId: string,
): Promise<CandidateEmbeddingInfo> {
  const [{ settings }, embeddingRes] = await Promise.all([
    readDataSourcesSettings(),
    query<{ has_embedding: boolean }>(
      `SELECT embedding IS NOT NULL AS has_embedding FROM events WHERE id = $1`,
      [eventId],
    ),
  ]);

  const embeddingSettings = settings.embedding;
  const provider = embeddingSettings.enabled ? embeddingSettings.provider : undefined;
  const model =
    provider === 'local'
      ? embeddingSettings.local.model
      : provider === 'api'
        ? embeddingSettings.api.model
        : undefined;

  return {
    enabled: embeddingSettings.enabled,
    hasEmbedding: Boolean(embeddingRes.rows[0]?.has_embedding),
    provider,
    model,
    dimensions: embeddingSettings.enabled ? embeddingSettings.dimensions : undefined,
  };
}

/** Fallback when event_topics is empty but category_hint maps to a topic. */
export function fallbackTopicFromCategoryHint(
  categoryHint?: string | null,
): CandidateTopicClassification | null {
  if (!categoryHint) return null;
  const def = getTopicDefinition(categoryHint) ?? TOPIC_DEFINITIONS[categoryHint];
  if (!def) return null;

  return {
    slug: def.slug,
    name: def.name,
    nameEn: def.nameEn,
    confidence: 0.5,
    reason: '来自采集分类标签',
  };
}

export async function loadSimilarEvents(
  eventId: string,
  limit = 5,
): Promise<CandidateSimilarItem[]> {
  const { settings } = await readDataSourcesSettings();
  if (!settings.embedding.enabled) return [];

  const minSimilarity = Math.min(settings.embedding.minSimilarity, 0.45);

  const res = await query<{
    event_id: string;
    candidate_id: string | null;
    slug: string;
    title: string;
    tracking_status: string;
    heat_score: string;
    similarity: string;
  }>(
    `SELECT e.id AS event_id,
            hc.id AS candidate_id,
            e.slug,
            e.title,
            e.tracking_status,
            e.heat_score::text,
            (1 - (e.embedding <=> src.embedding))::text AS similarity
     FROM events src
     JOIN events e ON e.id <> src.id
     LEFT JOIN hotspot_candidates hc
       ON hc.event_id = e.id AND hc.status = 'open' AND e.tracking_status = 'candidate'
     WHERE src.id = $1
       AND src.embedding IS NOT NULL
       AND e.embedding IS NOT NULL
       AND e.tracking_status IN ('candidate', 'tracking')
       AND 1 - (e.embedding <=> src.embedding) >= $2
     ORDER BY e.embedding <=> src.embedding ASC
     LIMIT $3`,
    [eventId, minSimilarity, limit],
  );

  return res.rows.map((row) => ({
    eventId: row.event_id,
    candidateId: row.candidate_id ?? undefined,
    slug: row.slug,
    title: row.title,
    trackingStatus: row.tracking_status as CandidateSimilarItem['trackingStatus'],
    similarity: Number(row.similarity),
    heatScore: Number(row.heat_score),
  }));
}
