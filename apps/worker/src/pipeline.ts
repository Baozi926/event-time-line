import { query } from '@event-time-line/database';

import { prepareArticlesForIngest } from '@event-time-line/shared';

import type { RawArticle } from '@event-time-line/shared';

import { fetchAllGdelt } from './fetchers/gdelt.js';

import { fetchAllHotTrends, isHotTrendEnabled } from './fetchers/hot-trend.js';

import { fetchDueRss } from './fetchers/rss.js';

import { fetchAllValyu, isValyuConfigured } from './fetchers/valyu.js';

import { fetchUsgsEarthquakes } from './fetchers/usgs.js';

import { buildRunArticlesMetadata, ingestArticles } from './services/articles.js';

import { clusterRawArticles } from './services/clustering.js';

import {

  scoreAllCandidates,

  archiveStaleEvents,

} from './services/scoring.js';

import { createDailySnapshots } from './services/snapshot.js';

import { collectTrackedEvents } from './services/tracked.js';

import { loadCollectionSchedule } from './schedule.js';



export async function runFetchPipeline(): Promise<void> {

  console.log('[pipeline] Starting fetch pipeline...');



  const runId = await startRun('fetch_all', 'mixed');



  let totalFound = 0;

  let totalNew = 0;

  let eventsTouched = 0;



  try {

    const gdeltResults = await fetchAllGdelt();

    for (const { category, articles, error } of gdeltResults) {

      if (error) {

        await query(

          `INSERT INTO collection_runs (run_type, source_type, category, status, error_message, finished_at)

           VALUES ('fetch_gdelt', 'gdelt_doc', $1, 'failed', $2, NOW())`,

          [category, error],

        );

        continue;

      }



      const batch = await ingestPreparedBatch(articles);

      totalFound += batch.found;

      totalNew += batch.newCount;

      eventsTouched += batch.eventsTouched;



      await query(

        `INSERT INTO collection_runs (run_type, source_type, category, status, articles_found, articles_new, metadata, finished_at)

         VALUES ('fetch_gdelt', 'gdelt_doc', $1, 'completed', $2, $3, $4, NOW())`,

        [category, batch.found, batch.newCount, JSON.stringify(batch.metadata)],

      );

    }



    if (isValyuConfigured()) {

      console.log('[pipeline] Valyu API key detected, fetching news…');

      const valyuResults = await fetchAllValyu();

      for (const { query: q, categoryHint, articles, error } of valyuResults) {

        if (error && articles.length === 0) {

          await query(

            `INSERT INTO collection_runs (run_type, source_type, category, status, error_message, finished_at)

             VALUES ('fetch_valyu', 'valyu', $1, 'failed', $2, NOW())`,

            [categoryHint, error],

          );

          continue;

        }



        const batch = await ingestPreparedBatch(articles);

        totalFound += batch.found;

        totalNew += batch.newCount;

        eventsTouched += batch.eventsTouched;



        await query(

          `INSERT INTO collection_runs (run_type, source_type, category, status, articles_found, articles_new, metadata, finished_at)

           VALUES ('fetch_valyu', 'valyu', $1, $2, $3, $4, $5, NOW())`,

          [

            categoryHint,

            error ? 'failed' : 'completed',

            batch.found,

            batch.newCount,

            JSON.stringify({ ...batch.metadata, query: q, ...(error ? { warning: error } : {}) }),

          ],

        );

      }

    } else {

      console.log('[pipeline] Valyu skipped (VALYU_API_KEY not set)');

    }



    try {

      const usgsArticles = await fetchUsgsEarthquakes();

      const usgsBatch = await ingestPreparedBatch(usgsArticles);

      totalFound += usgsBatch.found;

      totalNew += usgsBatch.newCount;

      eventsTouched += usgsBatch.eventsTouched;



      await query(

        `INSERT INTO collection_runs (run_type, source_type, status, articles_found, articles_new, metadata, finished_at)

         VALUES ('fetch_usgs', 'usgs_earthquake', 'completed', $1, $2, $3, NOW())`,

        [usgsBatch.found, usgsBatch.newCount, JSON.stringify(usgsBatch.metadata)],

      );

    } catch (err) {

      const message = err instanceof Error ? err.message : String(err);

      console.error('[pipeline] USGS fetch error:', err);

      await query(

        `INSERT INTO collection_runs (run_type, source_type, status, error_message, finished_at)

         VALUES ('fetch_usgs', 'usgs_earthquake', 'failed', $1, NOW())`,

        [message],

      );

    }



    const scored = await scoreAllCandidates();

    await archiveStaleEvents();



    await finishRun(runId, {

      status: 'completed',

      articlesFound: totalFound,

      articlesNew: totalNew,

      eventsCreated: eventsTouched,

      metadata: { scored, valyuEnabled: isValyuConfigured() },

    });



    console.log(

      `[pipeline] Done. found=${totalFound} new=${totalNew}`,

    );

  } catch (err) {

    await finishRun(runId, {

      status: 'failed',

      errorMessage: String(err),

    });

    throw err;

  }

}



async function ingestPreparedBatch(articles: RawArticle[]): Promise<{

  found: number;

  newCount: number;

  eventsTouched: number;

  metadata: ReturnType<typeof buildRunArticlesMetadata>;

}> {

  const prepared = prepareArticlesForIngest(articles);

  const result = await ingestArticles(prepared);

  const eventsTouched = await clusterRawArticles(prepared, result.articleIds);

  const metadata = buildRunArticlesMetadata(prepared, result.items);

  return {

    found: result.found,

    newCount: result.newCount,

    eventsTouched,

    metadata,

  };

}



export async function runHotTrendFetchPipeline(): Promise<void> {
  if (!(await isHotTrendEnabled())) {
    console.log('[pipeline] Hot-trend skipped (disabled in data source settings)');
    return;
  }

  console.log('[pipeline] Fetching hot-trend platforms (NewsNow)…');

  const hotTrendResults = await fetchAllHotTrends();
  let totalFound = 0;
  let totalNew = 0;
  let eventsTouched = 0;

  for (const { platform, platformName, articles, error } of hotTrendResults) {
    if (error && articles.length === 0) {
      await query(
        `INSERT INTO collection_runs (run_type, source_type, category, status, error_message, finished_at)
         VALUES ('fetch_hot_trend', 'hot_trend', $1, 'failed', $2, NOW())`,
        [platform, error],
      );
      continue;
    }

    const batch = await ingestPreparedBatch(articles);
    totalFound += batch.found;
    totalNew += batch.newCount;
    eventsTouched += batch.eventsTouched;

    await query(
      `INSERT INTO collection_runs (run_type, source_type, category, status, articles_found, articles_new, metadata, finished_at)
       VALUES ('fetch_hot_trend', 'hot_trend', $1, $2, $3, $4, $5, NOW())`,
      [
        platform,
        error ? 'failed' : 'completed',
        batch.found,
        batch.newCount,
        JSON.stringify({ ...batch.metadata, platformName, ...(error ? { warning: error } : {}) }),
      ],
    );
  }

  const scored = await scoreAllCandidates();

  console.log(
    `[pipeline] Hot-trend done. found=${totalFound} new=${totalNew} scored=${scored}`,
  );
}



export async function runRssFetchPipeline(options?: { force?: boolean }): Promise<void> {

  const { settings } = await loadCollectionSchedule();

  console.log(

    `[pipeline] Starting RSS fetch (default=${settings.rssDefaultIntervalMinutes}m, force=${Boolean(options?.force)})...`,

  );



  const { articles, feeds, fetchedCount, skippedCount } = await fetchDueRss({

    defaultIntervalMinutes: settings.rssDefaultIntervalMinutes,

    force: options?.force,

  });



  if (fetchedCount === 0) {
    console.log(`[pipeline] RSS tick: ${skippedCount} feed(s) skipped, nothing to fetch.`);
    return;
  }

  let totalFound = 0;
  let totalNew = 0;
  let eventsTouched = 0;

  for (const feedResult of feeds) {
    if (feedResult.status === 'skipped') continue;

    if (feedResult.status === 'failed') {
      feedResult.articlesFound = 0;
      feedResult.articlesNew = 0;
      continue;
    }

    const feedArticles = articles.filter(
      (article) => article.feedUrl === feedResult.feedUrl,
    );
    const batch = await ingestPreparedBatch(feedArticles);
    feedResult.articlesFound = batch.found;
    feedResult.articlesNew = batch.newCount;
    totalFound += batch.found;
    totalNew += batch.newCount;
    eventsTouched += batch.eventsTouched;
  }

  const rssBatch = { found: totalFound, newCount: totalNew, metadata: { articles: [] } };



  const attempted = feeds.filter((feed) => feed.status !== 'skipped');

  const rssAllFailed =

    attempted.length > 0 &&

    attempted.every((feed) => feed.status === 'failed');

  const rssStatus = rssAllFailed ? 'failed' : 'completed';

  const rssError = rssAllFailed ? '所有 RSS 订阅源采集失败' : null;



  const scored = await scoreAllCandidates();



  await query(

    `INSERT INTO collection_runs (

       run_type, source_type, status, error_message,

       articles_found, articles_new, metadata, finished_at

     )

     VALUES ('fetch_rss', 'rss', $1, $2, $3, $4, $5, NOW())`,

    [

      rssStatus,

      rssError,

      rssBatch.found,

      rssBatch.newCount,

      JSON.stringify({

        ...rssBatch.metadata,

        rssFeeds: feeds,

        scored,

        skippedCount,

      }),

    ],

  );



  console.log(

    `[pipeline] RSS done. fetched=${fetchedCount} skipped=${skippedCount} `

    + `found=${rssBatch.found} new=${rssBatch.newCount}`,

  );

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


