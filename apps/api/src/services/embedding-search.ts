import { query } from '@event-time-line/database';

import {

  createEmbeddings,

  formatVectorForPg,

} from '@event-time-line/shared';

import { readDataSourcesSettings, readEmbeddingApiKey } from './data-sources-settings.js';



export async function embedQueryText(text: string): Promise<number[] | null> {

  const { settings } = await readDataSourcesSettings();

  if (!settings.embedding.enabled) return null;



  const apiKey = settings.embedding.provider === 'api'

    ? await readEmbeddingApiKey()

    : null;

  if (settings.embedding.provider === 'api' && !apiKey) return null;



  const vectors = await createEmbeddings([text], settings.embedding, apiKey);

  return vectors?.[0] ?? null;

}



export async function searchEventsByVector(

  queryVector: number[],

  options: {

    minSimilarity: number;

    limit: number;

    offset: number;

    orderBy: string;

  },

): Promise<{ rows: Record<string, unknown>[]; total: number }> {

  const vectorLiteral = formatVectorForPg(queryVector);



  const [rows, count] = await Promise.all([

    query(

      `SELECT e.*, 1 - (e.embedding <=> $1::vector) AS similarity

       FROM events e

       WHERE e.embedding IS NOT NULL

         AND e.tracking_status IN ('candidate', 'tracking')

         AND 1 - (e.embedding <=> $1::vector) >= $2

       ORDER BY ${options.orderBy}

       LIMIT $3 OFFSET $4`,

      [vectorLiteral, options.minSimilarity, options.limit, options.offset],

    ),

    query<{ count: string }>(

      `SELECT COUNT(*)::text AS count

       FROM events e

       WHERE e.embedding IS NOT NULL

         AND e.tracking_status IN ('candidate', 'tracking')

         AND 1 - (e.embedding <=> $1::vector) >= $2`,

      [vectorLiteral, options.minSimilarity],

    ),

  ]);



  return {

    rows: rows.rows,

    total: parseInt(count.rows[0].count, 10),

  };

}


