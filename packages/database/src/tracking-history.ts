import type { TrackingAction, TrackingSource } from '@event-time-line/shared';
import { query } from './client.js';

export async function recordTrackingHistory(
  eventId: string,
  action: TrackingAction,
  source: TrackingSource = 'manual',
): Promise<void> {
  await query(
    `INSERT INTO tracking_history (event_id, action, source) VALUES ($1, $2, $3)`,
    [eventId, action, source],
  );
}
