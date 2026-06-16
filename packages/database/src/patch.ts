import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_RSS_FEEDS,
  DEFAULT_COLLECTION_SCHEDULE,
  DEFAULT_DATA_SOURCES_SETTINGS,
  DATA_SOURCES_SETTINGS_KEY,
} from '@event-time-line/shared';
import { query, closePool } from './client.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const patches = [
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS category_hint VARCHAR(50)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS rss_feeds (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    url         VARCHAR(2048) NOT NULL UNIQUE,
    domain      VARCHAR(255) NOT NULL,
    language    VARCHAR(10) NOT NULL DEFAULT 'en',
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rss_feeds_enabled ON rss_feeds (enabled, sort_order)`,
  `ALTER TABLE rss_feeds ADD COLUMN IF NOT EXISTS is_builtin BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE rss_feeds ADD COLUMN IF NOT EXISTS fetch_interval_minutes INT`,
  `ALTER TABLE rss_feeds ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS country_code CHAR(2)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_country ON articles (country_code) WHERE country_code IS NOT NULL`,
  `UPDATE sources SET country_code = NULL WHERE domain = 'earthquake.usgs.gov'`,
  `DO $$ BEGIN
     CREATE TYPE tracking_action AS ENUM ('tracked', 'untracked');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
  `CREATE TABLE IF NOT EXISTS tracking_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    action      tracking_action NOT NULL,
    source      VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tracking_history_created ON tracking_history (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_tracking_history_event ON tracking_history (event_id, created_at DESC)`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS feed_url VARCHAR(2048)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_feed_url ON articles (feed_url, fetched_at DESC) WHERE feed_url IS NOT NULL`,
  `DO $$ BEGIN
     CREATE TYPE user_role AS ENUM ('admin', 'user');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)`,
];

async function patch() {
  for (const sql of patches) {
    await query(sql);
  }

  const builtinUrls = DEFAULT_RSS_FEEDS.map((f) => f.url);
  await query(
    `UPDATE rss_feeds SET is_builtin = TRUE WHERE url = ANY($1::text[])`,
    [builtinUrls],
  );

  for (let i = 0; i < DEFAULT_RSS_FEEDS.length; i++) {
    const feed = DEFAULT_RSS_FEEDS[i];
    await query(
      `INSERT INTO rss_feeds (name, url, domain, language, enabled, is_builtin, sort_order)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, $5)
       ON CONFLICT (url) DO UPDATE SET
         is_builtin = TRUE,
         name = EXCLUDED.name,
         domain = EXCLUDED.domain,
         language = EXCLUDED.language`,
      [feed.name, feed.url, feed.domain, feed.language, i],
    );
  }

  await query(
    `UPDATE app_settings
     SET value = value || $1::jsonb, updated_at = NOW()
     WHERE key = 'collection_schedule'
       AND value->>'rssDefaultIntervalMinutes' IS NULL`,
    [JSON.stringify({ rssDefaultIntervalMinutes: DEFAULT_COLLECTION_SCHEDULE.rssDefaultIntervalMinutes })],
  );

  await query(
    `UPDATE app_settings
     SET value = $1::jsonb, updated_at = NOW()
     WHERE key = 'collection_schedule'
       AND (value->>'fetchIntervalMinutes')::int = 1440
       AND (value->>'trackedIntervalMinutes')::int = 1440`,
    [JSON.stringify(DEFAULT_COLLECTION_SCHEDULE)],
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

  console.log('Database patches applied.');
  await closePool();
}

patch().catch((err) => {
  console.error('Patch failed:', err);
  process.exit(1);
});
