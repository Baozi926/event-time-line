import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool } from '@event-time-line/database';
import {
  runFetchPipeline,
  runHotTrendFetchPipeline,
  runRssFetchPipeline,
  runSnapshotPipeline,
  runTrackedPipeline,
} from './pipeline.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

async function main() {
  const cmd = process.argv[2] ?? 'fetch';

  try {
    switch (cmd) {
      case 'fetch':
        await runFetchPipeline();
        break;
      case 'fetch-hot-trend':
        await runHotTrendFetchPipeline();
        break;
      case 'fetch-rss':
        await runRssFetchPipeline({ force: true });
        break;
      case 'tracked':
        await runTrackedPipeline();
        break;
      case 'snapshot':
        await runSnapshotPipeline();
        break;
      case 'embed-backfill': {
        const { runEmbedBackfill } = await import('./services/event-embeddings.js');
        const force = process.argv.includes('--force');
        await runEmbedBackfill(force);
        break;
      }
      case 'all':
        await runFetchPipeline();
        await runHotTrendFetchPipeline();
        await runRssFetchPipeline({ force: true });
        await runTrackedPipeline();
        await runSnapshotPipeline();
        break;
      default:
        console.error(`Unknown command: ${cmd}. Use fetch|fetch-hot-trend|fetch-rss|tracked|snapshot|embed-backfill|all`);
        process.exit(1);
    }
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
