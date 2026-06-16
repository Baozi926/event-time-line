import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync } from 'node:crypto';
import {
  DEFAULT_RSS_FEEDS,
  DEFAULT_COLLECTION_SCHEDULE,
  DEFAULT_DATA_SOURCES_SETTINGS,
  DATA_SOURCES_SETTINGS_KEY,
} from '@event-time-line/shared';
import { query, closePool } from './client.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Skipping admin seed (set ADMIN_EMAIL and ADMIN_PASSWORD in .env)');
    return;
  }

  const passwordHash = hashPassword(password);
  await query(
    `INSERT INTO users (email, display_name, password_hash, role)
     VALUES ($1, '管理员', $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       updated_at = NOW()`,
    [email, passwordHash],
  );
  console.log(`Admin user ready: ${email}`);
}

const TIER1_DOMAINS = [
  { domain: 'reuters.com', name: 'Reuters', tier: 'tier1' },
  { domain: 'bbc.com', name: 'BBC', tier: 'tier1' },
  { domain: 'bbc.co.uk', name: 'BBC', tier: 'tier1' },
  { domain: 'apnews.com', name: 'AP News', tier: 'tier1' },
  { domain: 'aljazeera.com', name: 'Al Jazeera', tier: 'tier1' },
  { domain: 'theguardian.com', name: 'The Guardian', tier: 'tier1' },
  { domain: 'nytimes.com', name: 'New York Times', tier: 'tier1' },
  { domain: 'washingtonpost.com', name: 'Washington Post', tier: 'tier1' },
  { domain: 'cnn.com', name: 'CNN', tier: 'tier2' },
  { domain: 'dw.com', name: 'DW', tier: 'tier1' },
  { domain: 'france24.com', name: 'France 24', tier: 'tier1' },
  { domain: 'npr.org', name: 'NPR', tier: 'tier1' },
];

async function seed() {
  console.log('Seeding admin user...');
  await seedAdminUser();
  console.log('Seeding tier-1 sources...');
  for (const s of TIER1_DOMAINS) {
    await query(
      `INSERT INTO sources (name, domain, credibility_tier)
       VALUES ($1, $2, $3::credibility_tier)
       ON CONFLICT (domain) DO UPDATE SET credibility_tier = EXCLUDED.credibility_tier`,
      [s.name, s.domain, s.tier],
    );
  }
  console.log('Seeding collection schedule defaults...');
  await query(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [
      'collection_schedule',
      JSON.stringify(DEFAULT_COLLECTION_SCHEDULE),
    ],
  );
  console.log('Seeding data source defaults...');
  await query(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [
      DATA_SOURCES_SETTINGS_KEY,
      JSON.stringify(DEFAULT_DATA_SOURCES_SETTINGS),
    ],
  );
  console.log('Seeding default RSS feeds...');
  for (let i = 0; i < DEFAULT_RSS_FEEDS.length; i++) {
    const feed = DEFAULT_RSS_FEEDS[i];
    await query(
      `INSERT INTO rss_feeds (name, url, domain, language, enabled, is_builtin, sort_order)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, $5)
       ON CONFLICT (url) DO UPDATE SET is_builtin = TRUE`,
      [feed.name, feed.url, feed.domain, feed.language, i],
    );
  }
  console.log('Seed completed.');
  await closePool();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
