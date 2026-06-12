import type { FastifyInstance } from 'fastify';
import { query } from '@event-time-line/database';
import { mapCandidate } from '../mappers.js';

function extractKeywords(title: string): string[] {
  return title
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);
}

function buildQuery(keywords: string[]): string {
  if (keywords.length === 0) return '';
  if (keywords.length === 1) return `"${keywords[0]}"`;
  return `(${keywords.map((k) => `"${k}"`).join(' OR ')})`;
}

export async function candidateRoutes(app: FastifyInstance) {
  app.get('/api/v1/candidates', {
    schema: { tags: ['candidates'] },
  }, async (req) => {
    const { limit = 30, offset = 0 } = req.query as {
      limit?: number;
      offset?: number;
    };

    const [rows, count] = await Promise.all([
      query(
        `SELECT hc.* FROM hotspot_candidates hc
         JOIN events e ON e.id = hc.event_id
         WHERE hc.status = 'open' AND e.tracking_status = 'candidate'
         ORDER BY hc.heat_score DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      query(
        `SELECT COUNT(*)::text AS count FROM hotspot_candidates hc
         JOIN events e ON e.id = hc.event_id
         WHERE hc.status = 'open' AND e.tracking_status = 'candidate'`,
      ),
    ]);

    return {
      candidates: rows.rows.map(mapCandidate),
      total: parseInt(count.rows[0].count as string, 10),
      limit,
      offset,
    };
  });

  app.post('/api/v1/candidates/:id/track', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const candidate = await query<{ event_id: string; title: string }>(
      'SELECT event_id, title FROM hotspot_candidates WHERE id = $1',
      [id],
    );
    if (!candidate.rows[0]?.event_id) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

    const eventId = candidate.rows[0].event_id;
    const keywords = extractKeywords(candidate.rows[0].title);

    await query(
      `UPDATE events SET tracking_status = 'tracking', updated_at = NOW() WHERE id = $1`,
      [eventId],
    );

    const existing = await query('SELECT 1 FROM event_queries WHERE event_id = $1', [eventId]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO event_queries (event_id, keywords, gdelt_query) VALUES ($1, $2, $3)`,
        [eventId, keywords, buildQuery(keywords)],
      );
    }

    await query(
      `UPDATE hotspot_candidates SET status = 'promoted', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    return { success: true, eventId };
  });

  app.post('/api/v1/candidates/:id/archive', {
    schema: { tags: ['candidates'] },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const candidate = await query<{ event_id: string }>(
      'SELECT event_id FROM hotspot_candidates WHERE id = $1',
      [id],
    );
    if (!candidate.rows[0]?.event_id) {
      return reply.status(404).send({ error: 'Candidate not found' });
    }

    await query(
      `UPDATE events SET tracking_status = 'archived', updated_at = NOW() WHERE id = $1`,
      [candidate.rows[0].event_id],
    );
    await query(
      `UPDATE hotspot_candidates SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    return { success: true };
  });
}
