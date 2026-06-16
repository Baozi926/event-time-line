import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, Queue } from 'bullmq';
import {
  runFetchPipeline,
  runHotTrendFetchPipeline,
  runRssFetchPipeline,
  runSnapshotPipeline,
  runTrackedPipeline,
} from './pipeline.js';
import {
  applyCollectionSchedules,
  loadCollectionSchedule,
  watchCollectionSchedule,
} from './schedule.js';
import { loadDataSourcesSettings } from './services/data-sources-settings.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = { url: redisUrl, maxRetriesPerRequest: null };

const QUEUE_NAME = 'event-pipeline';

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`Processing job: ${job.name}`);
    switch (job.name) {
      case 'fetch':
        await runFetchPipeline();
        break;
      case 'fetch-rss':
        await runRssFetchPipeline();
        break;
      case 'fetch-hot-trend':
        await runHotTrendFetchPipeline();
        break;
      case 'tracked':
        await runTrackedPipeline();
        break;
      case 'snapshot':
        await runSnapshotPipeline();
        break;
      default:
        console.warn(`Unknown job: ${job.name}`);
    }
  },
  { connection },
);

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));

const queue = new Queue(QUEUE_NAME, { connection });

async function bootstrap() {
  const [schedule, dataSources] = await Promise.all([
    loadCollectionSchedule(),
    loadDataSourcesSettings(),
  ]);
  await applyCollectionSchedules(
    queue,
    schedule.settings,
    dataSources.settings,
  );
  watchCollectionSchedule(
    queue,
    schedule.updatedAt,
    dataSources.updatedAt,
  );
  console.log('Scheduled jobs registered.');
}

bootstrap().catch(console.error);

console.log('Worker started. Waiting for jobs...');
