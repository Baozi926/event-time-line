import { query } from '@event-time-line/database';

import {
  MIN_TOPIC_CLASSIFICATION_CONFIDENCE,
  CLASSIFIABLE_TOPIC_SLUGS,
  matchTopicsFromText,
  type TopicClassificationResult,
} from '@event-time-line/shared';

import {
  classifyEventWithDeepSeek,
  shouldSkipReclassification,
} from './deepseek-classifier.js';
import {
  loadDataSourcesSettings,
  loadDeepSeekApiKey,
} from './data-sources-settings.js';
import { classifyEventTopicsByEmbedding } from './topic-embedding-classifier.js';



async function getMaxTopicConfidence(eventId: string): Promise<number | null> {

  const res = await query<{ max_confidence: string | null }>(

    `SELECT MAX(confidence)::text AS max_confidence

     FROM event_topics

     WHERE event_id = $1

       AND classification_reason IS NOT NULL

       AND classification_reason <> '规则关键词匹配'`,

    [eventId],

  );

  const value = res.rows[0]?.max_confidence;

  return value != null ? Number(value) : null;

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



async function writeRuleBasedTopics(

  eventId: string,

  title: string,

  summary?: string | null,

  categoryHint?: string | null,

): Promise<void> {

  const text = `${title} ${summary ?? ''}`;

  const matchedSlugs = new Set(matchTopicsFromText(text));



  if (categoryHint && CLASSIFIABLE_TOPIC_SLUGS.includes(categoryHint)) {

    matchedSlugs.add(categoryHint);

  }



  const classifications = [...matchedSlugs].map((slug) => ({

    slug,

    confidence: 0.6,

    reason: '规则关键词匹配',

  }));



  await writeTopicClassifications(eventId, classifications);

}



async function countEventTopics(eventId: string): Promise<number> {

  const res = await query<{ count: string }>(

    `SELECT COUNT(*)::text AS count FROM event_topics WHERE event_id = $1`,

    [eventId],

  );

  return parseInt(res.rows[0]?.count ?? '0', 10);

}



/** Tag event with DeepSeek topic classifications, falling back to rule matching. */

export async function tagEventTopics(

  eventId: string,

  title: string,

  summary?: string | null,

  categoryHint?: string | null,

): Promise<void> {

  const maxConfidence = await getMaxTopicConfidence(eventId);

  if (shouldSkipReclassification(maxConfidence)) return;

  const { settings } = await loadDataSourcesSettings();
  const deepSeekApiKey = settings.aiEnhancement.enabled
    ? await loadDeepSeekApiKey()
    : null;
  if (settings.aiEnhancement.enabled && deepSeekApiKey) {

    try {

      const classifications = await classifyEventWithDeepSeek(
        deepSeekApiKey,
        title,
        summary,
        categoryHint,
      );

      if (classifications.length > 0) {

        await writeTopicClassifications(eventId, classifications);

        return;

      }

    } catch (error) {

      console.warn(

        `[event-topics] DeepSeek classification failed for event ${eventId}:`,

        error instanceof Error ? error.message : error,

      );

    }

  }



  const hasReliableTopics =

    typeof maxConfidence === 'number' && maxConfidence >= MIN_TOPIC_CLASSIFICATION_CONFIDENCE;

  if (!hasReliableTopics) {

    await writeRuleBasedTopics(eventId, title, summary, categoryHint);

    const topicCount = await countEventTopics(eventId);

    if (topicCount === 0) {

      const embeddingTopics = await classifyEventTopicsByEmbedding(

        eventId,

        title,

        summary,

      );

      if (embeddingTopics.length > 0) {

        await writeTopicClassifications(eventId, embeddingTopics);

      }

    }

  }

}


