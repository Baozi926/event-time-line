import { query } from '@event-time-line/database';

import {

  createEmbeddings,

  EMBEDDING_API_KEY_SETTINGS_KEY,

  formatVectorForPg,

} from '@event-time-line/shared';

import { loadDataSourcesSettings } from './data-sources-settings.js';



export async function loadEmbeddingApiKey(): Promise<string | null> {

  const res = await query<{ value: unknown }>(

    `SELECT value FROM app_settings WHERE key = $1`,

    [EMBEDDING_API_KEY_SETTINGS_KEY],

  );

  const value = res.rows[0]?.value;

  if (!value || typeof value !== 'object') return null;

  const apiKey = (value as { apiKey?: unknown }).apiKey;

  return typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;

}



export async function embedEvent(eventId: string, title?: string): Promise<void> {

  const { settings } = await loadDataSourcesSettings();

  if (!settings.embedding.enabled) return;



  let embedTitle = title?.trim();

  if (!embedTitle) {

    const res = await query<{ title: string; has_embedding: boolean }>(

      `SELECT title, embedding IS NOT NULL AS has_embedding

       FROM events WHERE id = $1`,

      [eventId],

    );

    if (!res.rows[0]) return;

    if (res.rows[0].has_embedding) return;

    embedTitle = res.rows[0].title;

  } else {

    const res = await query<{ has_embedding: boolean }>(

      `SELECT embedding IS NOT NULL AS has_embedding FROM events WHERE id = $1`,

      [eventId],

    );

    if (res.rows[0]?.has_embedding) return;

  }



  const apiKey = settings.embedding.provider === 'api'

    ? await loadEmbeddingApiKey()

    : null;

  if (settings.embedding.provider === 'api' && !apiKey) {

    console.warn(`[embed] API provider selected but no API key for event ${eventId}`);

    return;

  }



  const vectors = await createEmbeddings(

    [embedTitle.slice(0, 300)],

    settings.embedding,

    apiKey,

  );

  if (!vectors?.[0]) {

    console.warn(`[embed] failed for event ${eventId}`);

    return;

  }



  await query(

    `UPDATE events SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,

    [formatVectorForPg(vectors[0]), eventId],

  );

}



export async function runEmbedBackfill(force = false): Promise<void> {

  const { settings } = await loadDataSourcesSettings();

  if (!settings.embedding.enabled) {

    console.log('[embed-backfill] embedding disabled in settings, skipping');

    return;

  }



  const batchSize = 50;
  let processed = 0;
  let offset = 0;

  while (true) {
    const res = await query<{ id: string; title: string }>(
      force
        ? `SELECT id, title FROM events ORDER BY created_at ASC LIMIT $1 OFFSET $2`
        : `SELECT id, title FROM events WHERE embedding IS NULL ORDER BY created_at ASC LIMIT $1`,
      force ? [batchSize, offset] : [batchSize],
    );

    if (res.rows.length === 0) break;

    for (const row of res.rows) {
      if (force) {
        await query(`UPDATE events SET embedding = NULL WHERE id = $1`, [row.id]);
      }
      await embedEvent(row.id, row.title);
    }

    processed += res.rows.length;
    if (force) offset += res.rows.length;
    console.log(`[embed-backfill] processed ${processed} events`);

    if (res.rows.length < batchSize) break;
  }



  console.log(`[embed-backfill] done, total ${processed} events`);

}


