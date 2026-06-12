import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getPool, closePool } from './client.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../schema.sql');

async function migrate() {
  const sql = readFileSync(schemaPath, 'utf-8');
  const pool = getPool();
  console.log('Running database migration...');
  await pool.query(sql);
  console.log('Migration completed successfully.');
  await closePool();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
