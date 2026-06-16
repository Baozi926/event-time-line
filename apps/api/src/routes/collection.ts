import type { FastifyInstance } from 'fastify';

import { query } from '@event-time-line/database';

import {

  COLLECTION_SCHEDULE_KEY,

  DEFAULT_COLLECTION_SCHEDULE,

  DEFAULT_RSS_FEEDS,

  parseCollectionSchedule,

  type CollectionScheduleSettings,

} from '@event-time-line/shared';

import {

  runFetchPipeline,

  runHotTrendFetchPipeline,

  runRssFetchPipeline,

  runSnapshotPipeline,

  runTrackedPipeline,

} from '@event-time-line/worker/pipeline';

import { mapCollectionRun } from '../mappers.js';

import { buildGdeltDailySummary } from '../utils/gdelt-daily.js';
import { buildRssDailySummary, mapRssArticleCountRows } from '../utils/rss-daily.js';
import { requireAdmin } from '../auth/middleware.js';



type CollectionJob = 'fetch' | 'fetch-hot-trend' | 'fetch-rss' | 'tracked' | 'snapshot' | 'all';



const runningJobs = new Set<CollectionJob>();



const jobRunners: Record<CollectionJob, () => Promise<void>> = {

  fetch: runFetchPipeline,

  'fetch-hot-trend': runHotTrendFetchPipeline,

  'fetch-rss': () => runRssFetchPipeline({ force: true }),

  tracked: runTrackedPipeline,

  snapshot: runSnapshotPipeline,

  all: async () => {

    await runFetchPipeline();

    await runHotTrendFetchPipeline();

    await runRssFetchPipeline({ force: true });

    await runTrackedPipeline();

    await runSnapshotPipeline();

  },

};



async function hasActiveDbRun(): Promise<boolean> {

  const res = await query(

    `SELECT 1 FROM collection_runs

     WHERE status = 'running' AND finished_at IS NULL

     LIMIT 1`,

  );

  return res.rows.length > 0;

}



async function readCollectionSchedule(): Promise<{

  settings: CollectionScheduleSettings;

  updatedAt: string;

}> {

  const res = await query<{ value: unknown; updated_at: Date }>(

    `SELECT value, updated_at FROM app_settings WHERE key = $1`,

    [COLLECTION_SCHEDULE_KEY],

  );



  if (res.rows.length === 0) {

    return {

      settings: DEFAULT_COLLECTION_SCHEDULE,

      updatedAt: new Date(0).toISOString(),

    };

  }



  const row = res.rows[0];

  return {

    settings: parseCollectionSchedule(row.value) ?? DEFAULT_COLLECTION_SCHEDULE,

    updatedAt: row.updated_at.toISOString(),

  };

}



async function loadRssFeedsForStats(): Promise<

  Array<{ id: string; name: string; url: string; enabled: boolean }>

> {

  const res = await query<{

    id: string;

    name: string;

    url: string;

    enabled: boolean;

  }>(

    `SELECT id::text AS id, name, url, enabled

     FROM rss_feeds

     ORDER BY sort_order, created_at`,

  );



  if (res.rows.length > 0) return res.rows;



  return DEFAULT_RSS_FEEDS.map((feed, index) => ({

    id: `default-${index}`,

    name: feed.name,

    url: feed.url,

    enabled: true,

  }));

}



export async function collectionRoutes(app: FastifyInstance) {

  app.get('/api/v1/collection/runs', {

    schema: { tags: ['collection'] },

  }, async (req) => {

    const { limit = 50, offset = 0 } = req.query as {

      limit?: number;

      offset?: number;

    };



    const [rows, count, active] = await Promise.all([

      query(

        `SELECT * FROM collection_runs

         ORDER BY started_at DESC

         LIMIT $1 OFFSET $2`,

        [limit, offset],

      ),

      query('SELECT COUNT(*)::text AS count FROM collection_runs'),

      query(

        `SELECT * FROM collection_runs

         WHERE status = 'running' AND finished_at IS NULL

         ORDER BY started_at DESC

         LIMIT 1`,

      ),

    ]);



    return {

      runs: rows.rows.map(mapCollectionRun),

      total: parseInt(count.rows[0].count as string, 10),

      limit,

      offset,

      activeRun: active.rows[0] ? mapCollectionRun(active.rows[0]) : null,

      isRunning: runningJobs.size > 0 || active.rows.length > 0,

    };

  });



  app.get('/api/v1/collection/gdelt-daily', {

    schema: { tags: ['collection'] },

  }, async () => {

    const [gdeltRuns, pipelineCount] = await Promise.all([

      query<{

        category: string;

        started_at: Date;

        status: string;

        articles_found: string;

        articles_new: string;

        error_message: string | null;

      }>(

        `SELECT category, started_at, status, articles_found, articles_new, error_message

         FROM collection_runs

         WHERE run_type = 'fetch_gdelt'

           AND started_at >= CURRENT_DATE

         ORDER BY started_at ASC`,

      ),

      query<{ count: string }>(

        `SELECT COUNT(*)::text AS count

         FROM collection_runs

         WHERE run_type = 'fetch_all'

           AND started_at >= CURRENT_DATE`,

      ),

    ]);



    return buildGdeltDailySummary(

      gdeltRuns.rows.map((row) => ({

        category: row.category,

        startedAt: row.started_at,

        status: row.status,

        articlesFound: Number(row.articles_found) || 0,

        articlesNew: Number(row.articles_new) || 0,

        errorMessage: row.error_message ?? undefined,

      })),

      parseInt(pipelineCount.rows[0]?.count ?? '0', 10),

    );

  });



  app.get('/api/v1/collection/rss-daily', {

    schema: { tags: ['collection'] },

  }, async () => {

    const [feeds, runs, articleCounts] = await Promise.all([

      loadRssFeedsForStats(),

      query<{ started_at: Date; status: string; metadata: unknown; articles_found: string; articles_new: string }>(

        `SELECT started_at, status, metadata, articles_found, articles_new

         FROM collection_runs

         WHERE run_type = 'fetch_rss'

           AND started_at >= CURRENT_DATE

         ORDER BY started_at ASC`,

      ),

      query<{ feed_url: string; found: string; new_count: string }>(

        `SELECT rf.url AS feed_url,
                COUNT(a.id)::text AS found,
                COUNT(a.id) FILTER (WHERE a.created_at >= CURRENT_DATE)::text AS new_count
         FROM rss_feeds rf
         LEFT JOIN articles a ON a.category_hint = 'rss'
           AND a.fetched_at >= CURRENT_DATE
           AND (
             a.feed_url = rf.url
             OR (
               a.feed_url IS NULL
               AND EXISTS (
                 SELECT 1 FROM sources s
                 WHERE s.id = a.source_id AND s.domain = rf.domain
               )
             )
           )
         GROUP BY rf.url`,

      ),

    ]);



    return buildRssDailySummary(

      feeds,

      runs.rows.map((row) => ({

        startedAt: row.started_at,

        status: row.status,

        metadata: row.metadata,

        articlesFound: Number(row.articles_found) || 0,

        articlesNew: Number(row.articles_new) || 0,

      })),

      mapRssArticleCountRows(articleCounts.rows),

    );

  });



  app.get('/api/v1/collection/runs/:id', {

    schema: { tags: ['collection'] },

  }, async (req, reply) => {

    const { id } = req.params as { id: string };



    const res = await query(

      `SELECT * FROM collection_runs WHERE id = $1`,

      [id],

    );



    if (res.rows.length === 0) {

      return reply.status(404).send({ error: '采集记录不存在' });

    }



    return { run: mapCollectionRun(res.rows[0]) };

  });



  app.post('/api/v1/collection/trigger', {

    schema: { tags: ['collection'] },

  }, async (req, reply) => {

    if (!requireAdmin(req, reply)) return;

    const { job = 'fetch' } = (req.body ?? {}) as { job?: CollectionJob };



    if (!jobRunners[job]) {

      return reply.status(400).send({

        error: '无效任务类型',

        allowed: Object.keys(jobRunners),

      });

    }



    if (runningJobs.size > 0 || (await hasActiveDbRun())) {

      return reply.status(409).send({ error: '已有采集任务在运行，请稍后再试' });

    }



    runningJobs.add(job);



    void (async () => {

      try {

        await jobRunners[job]();

      } catch (err) {

        app.log.error({ err, job }, 'Manual collection job failed');

      } finally {

        runningJobs.delete(job);

      }

    })();



    return {

      success: true,

      job,

      message: '采集任务已启动，请刷新页面查看进度',

    };

  });



  app.get('/api/v1/collection/settings', {

    schema: { tags: ['collection'] },

  }, async () => {

    return readCollectionSchedule();

  });



  app.put('/api/v1/collection/settings', {

    schema: { tags: ['collection'] },

  }, async (req, reply) => {

    if (!requireAdmin(req, reply)) return;

    const parsed = parseCollectionSchedule(req.body);

    if (!parsed) {

      return reply.status(400).send({ error: '无效的采集频率配置' });

    }



    const res = await query<{ updated_at: Date }>(

      `INSERT INTO app_settings (key, value, updated_at)

       VALUES ($1, $2::jsonb, NOW())

       ON CONFLICT (key) DO UPDATE

       SET value = EXCLUDED.value, updated_at = NOW()

       RETURNING updated_at`,

      [COLLECTION_SCHEDULE_KEY, JSON.stringify(parsed)],

    );



    return {

      settings: parsed,

      updatedAt: res.rows[0].updated_at.toISOString(),

      message: '采集频率已保存，Worker 将在约 30 秒内生效',

    };

  });

}


