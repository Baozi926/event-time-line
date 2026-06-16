import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_DATA_SOURCES_SETTINGS,
  DATA_SOURCES_SETTINGS_KEY,
  DEFAULT_COLLECTION_SCHEDULE,
} from '@event-time-line/shared';
import { query, closePool } from './client.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

await query(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

await query(
  `INSERT INTO app_settings (key, value)
   VALUES ($1, $2::jsonb)
   ON CONFLICT (key) DO NOTHING`,
  [
    'collection_schedule',
    JSON.stringify(DEFAULT_COLLECTION_SCHEDULE),
  ],
);

await query(
  `INSERT INTO app_settings (key, value)
   VALUES ($1, $2::jsonb)
   ON CONFLICT (key) DO NOTHING`,
  [
    DATA_SOURCES_SETTINGS_KEY,
    JSON.stringify(DEFAULT_DATA_SOURCES_SETTINGS),
  ],
);

console.log('app_settings patch applied.');
await closePool();
