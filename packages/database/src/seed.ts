import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closePool } from './client.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

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
  { domain: 'xinhuanet.com', name: '新华网', tier: 'tier2' },
];

async function seed() {
  console.log('Seeding tier-1 sources...');
  for (const s of TIER1_DOMAINS) {
    await query(
      `INSERT INTO sources (name, domain, credibility_tier)
       VALUES ($1, $2, $3::credibility_tier)
       ON CONFLICT (domain) DO UPDATE SET credibility_tier = EXCLUDED.credibility_tier`,
      [s.name, s.domain, s.tier],
    );
  }
  console.log('Seed completed.');
  await closePool();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
