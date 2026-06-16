import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import type {
  DashboardCategoryActivity,
  DashboardDailyCount,
  DashboardStats,
  DashboardTopCandidate,
  DashboardTopEvent,
} from '@event-time-line/shared';
import { mapCollectionRun } from '../mappers.js';

function int(row: Record<string, unknown>, key: string): number {
  return parseInt(row[key] as string, 10) || 0;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get('/api/v1/stats/dashboard', {
    schema: { tags: ['stats'] },
  }, async () => {
    const [
      articles,
      sources,
      eventsByStatus,
      openCandidates,
      runTotals,
      last24h,
      activeRun,
      recentRuns,
      topEvents,
      topCandidates,
      articlesDaily,
      categoryActivity,
    ] = await Promise.all([
      query<{ total: string; last_24h: string; last_1h: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE fetched_at >= NOW() - INTERVAL '24 hours')::text AS last_24h,
           COUNT(*) FILTER (WHERE fetched_at >= NOW() - INTERVAL '1 hour')::text AS last_1h
         FROM articles`,
      ),
      query<{ total: string }>('SELECT COUNT(*)::text AS total FROM sources'),
      query<{ tracking_status: string; count: string }>(
        `SELECT tracking_status, COUNT(*)::text AS count
         FROM events
         GROUP BY tracking_status`,
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM hotspot_candidates WHERE status = 'open'`,
      ),
      query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM collection_runs',
      ),
      query<Record<string, string>>(
        `SELECT
           COUNT(*)::text AS runs,
           COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
           COALESCE(SUM(articles_found), 0)::text AS articles_found,
           COALESCE(SUM(articles_new), 0)::text AS articles_new,
           COALESCE(SUM(events_created), 0)::text AS events_created,
           COALESCE(SUM(events_promoted), 0)::text AS events_promoted
         FROM collection_runs
         WHERE started_at >= NOW() - INTERVAL '24 hours'`,
      ),
      query(
        `SELECT * FROM collection_runs
         WHERE status = 'running' AND finished_at IS NULL
         ORDER BY started_at DESC
         LIMIT 1`,
      ),
      query(
        `SELECT * FROM collection_runs
         ORDER BY started_at DESC
         LIMIT 8`,
      ),
      query(
        `SELECT id, slug, title, heat_score, article_count, source_count, last_updated_at
         FROM events
         WHERE tracking_status = 'tracking'
         ORDER BY heat_score DESC, last_updated_at DESC
         LIMIT 6`,
      ),
      query(
        `SELECT id, title, heat_score, article_count, source_count
         FROM hotspot_candidates
         WHERE status = 'open'
         ORDER BY heat_score DESC
         LIMIT 6`,
      ),
      query<{ date: Date; count: string }>(
        `SELECT DATE(fetched_at) AS date, COUNT(*)::text AS count
         FROM articles
         WHERE fetched_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(fetched_at)
         ORDER BY date ASC`,
      ),
      query<{ category: string; articles_found: string; articles_new: string; runs: string }>(
        `SELECT
           category,
           COALESCE(SUM(articles_found), 0)::text AS articles_found,
           COALESCE(SUM(articles_new), 0)::text AS articles_new,
           COUNT(*)::text AS runs
         FROM collection_runs
         WHERE started_at >= NOW() - INTERVAL '24 hours'
           AND category IS NOT NULL
         GROUP BY category
         ORDER BY SUM(articles_new) DESC`,
      ),
    ]);

    const eventMap = Object.fromEntries(
      eventsByStatus.rows.map((r) => [r.tracking_status, int(r, 'count')]),
    );
    const tracking = eventMap.tracking ?? 0;
    const candidate = eventMap.candidate ?? 0;
    const archived = eventMap.archived ?? 0;

    const stats: DashboardStats = {
      generatedAt: new Date().toISOString(),
      collection: {
        isRunning: activeRun.rows.length > 0,
        activeRun: activeRun.rows[0]
          ? mapCollectionRun(activeRun.rows[0])
          : null,
        totalRuns: int(runTotals.rows[0], 'total'),
        last24h: {
          runs: int(last24h.rows[0], 'runs'),
          completed: int(last24h.rows[0], 'completed'),
          failed: int(last24h.rows[0], 'failed'),
          articlesFound: int(last24h.rows[0], 'articles_found'),
          articlesNew: int(last24h.rows[0], 'articles_new'),
          eventsCreated: int(last24h.rows[0], 'events_created'),
          eventsPromoted: int(last24h.rows[0], 'events_promoted'),
        },
        recentRuns: recentRuns.rows.map(mapCollectionRun),
        categoryActivity: categoryActivity.rows.map(
          (r): DashboardCategoryActivity => ({
            category: r.category,
            articlesFound: parseInt(r.articles_found, 10) || 0,
            articlesNew: parseInt(r.articles_new, 10) || 0,
            runs: parseInt(r.runs, 10) || 0,
          }),
        ),
      },
      data: {
        articles: {
          total: int(articles.rows[0], 'total'),
          last24h: int(articles.rows[0], 'last_24h'),
          last1h: int(articles.rows[0], 'last_1h'),
        },
        sources: { total: int(sources.rows[0], 'total') },
        events: {
          tracking,
          candidate,
          archived,
          total: tracking + candidate + archived,
        },
        candidates: { open: int(openCandidates.rows[0], 'total') },
      },
      topEvents: topEvents.rows.map(
        (r): DashboardTopEvent => ({
          id: r.id as string,
          slug: r.slug as string,
          title: r.title as string,
          heatScore: Number(r.heat_score),
          articleCount: Number(r.article_count),
          sourceCount: Number(r.source_count),
          lastUpdatedAt: (r.last_updated_at as Date).toISOString(),
        }),
      ),
      topCandidates: topCandidates.rows.map(
        (r): DashboardTopCandidate => ({
          id: r.id as string,
          title: r.title as string,
          heatScore: Number(r.heat_score),
          articleCount: Number(r.article_count),
          sourceCount: Number(r.source_count),
        }),
      ),
      articlesDaily: articlesDaily.rows.map(
        (r): DashboardDailyCount => ({
          date: (r.date as Date).toISOString().slice(0, 10),
          count: parseInt(r.count, 10) || 0,
        }),
      ),
    };

    return stats;
  });
}
