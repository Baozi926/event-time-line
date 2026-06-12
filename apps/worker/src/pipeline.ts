import { query } from '@event-time-line/database';
import { fetchAllGdelt } from './fetchers/gdelt.js';
import { fetchAllRss } from './fetchers/rss.js';
import { ingestArticles } from './services/articles.js';
import { clusterRawArticles } from './services/clustering.js';
import {
  scoreAllCandidates,
  promoteEligibleEvents,
  archiveStaleEvents,
} from './services/scoring.js';
import { createDailySnapshots } from './services/snapshot.js';
import { collectTrackedEvents } from './services/tracked.js';

export async function runFetchPipeline(): Promise<void> {
  console.log('[pipeline] Starting fetch pipeline...');

  const runId = await startRun('fetch_all', 'mixed');

  let totalFound = 0;
  let totalNew = 0;
  let eventsTouched = 0;

  try {
    const gdeltResults = await fetchAllGdelt();
    for (const { category, articles } of gdeltResults) {
      const { found, newCount, articleIds } = await ingestArticles(articles);
      totalFound += found;
      totalNew += newCount;
      eventsTouched += await clusterRawArticles(articles, articleIds);

      await query(
        `INSERT INTO collection_runs (run_type, source_type, category, status, articles_found, articles_new, finished_at)
         VALUES ('fetch_gdelt', 'gdelt_doc', $1, 'completed', $2, $3, NOW())`,
        [category, found, newCount],
      );
    }

    const rssArticles = await fetchAllRss();
    const rssResult = await ingestArticles(rssArticles);
    totalFound += rssResult.found;
    totalNew += rssResult.newCount;
    eventsTouched += await clusterRawArticles(rssArticles, rssResult.articleIds);

    await query(
      `INSERT INTO collection_runs (run_type, source_type, status, articles_found, articles_new, finished_at)
       VALUES ('fetch_rss', 'rss', 'completed', $1, $2, NOW())`,
      [rssResult.found, rssResult.newCount],
    );

    const scored = await scoreAllCandidates();
    const promoted = await promoteEligibleEvents();
    await archiveStaleEvents();

    await finishRun(runId, {
      status: 'completed',
      articlesFound: totalFound,
      articlesNew: totalNew,
      eventsCreated: eventsTouched,
      eventsPromoted: promoted,
      metadata: { scored },
    });

    console.log(
      `[pipeline] Done. found=${totalFound} new=${totalNew} promoted=${promoted}`,
    );
  } catch (err) {
    await finishRun(runId, {
      status: 'failed',
      errorMessage: String(err),
    });
    throw err;
  }
}

export async function runTrackedPipeline(): Promise<void> {
  console.log('[pipeline] Collecting tracked events...');
  const result = await collectTrackedEvents();
  console.log(`[pipeline] Tracked: ${result.events} events, ${result.newArticles} new articles`);
}

export async function runSnapshotPipeline(): Promise<void> {
  console.log('[pipeline] Creating daily snapshots...');
  const count = await createDailySnapshots();
  console.log(`[pipeline] Snapshots created: ${count}`);
}

async function startRun(runType: string, sourceType: string): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO collection_runs (run_type, source_type, status)
     VALUES ($1, $2, 'running') RETURNING id`,
    [runType, sourceType],
  );
  return res.rows[0].id;
}

async function finishRun(
  id: string,
  opts: {
    status: string;
    articlesFound?: number;
    articlesNew?: number;
    eventsCreated?: number;
    eventsPromoted?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await query(
    `UPDATE collection_runs SET
      status = $2,
      articles_found = COALESCE($3, articles_found),
      articles_new = COALESCE($4, articles_new),
      events_created = COALESCE($5, events_created),
      events_promoted = COALESCE($6, events_promoted),
      error_message = $7,
      metadata = $8,
      finished_at = NOW()
    WHERE id = $1`,
    [
      id,
      opts.status,
      opts.articlesFound ?? null,
      opts.articlesNew ?? null,
      opts.eventsCreated ?? null,
      opts.eventsPromoted ?? null,
      opts.errorMessage ?? null,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
    ],
  );
}
