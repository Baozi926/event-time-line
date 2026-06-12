import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  runFetchPipeline,
  runSnapshotPipeline,
  runTrackedPipeline,
} from './pipeline.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const QUEUE_NAME = 'event-pipeline';

async function setupSchedules(queue: Queue) {
  await queue.add('fetch', {}, { repeat: { pattern: '*/30 * * * *' } });
  await queue.add('score', {}, { repeat: { pattern: '0 * * * *' } });
  await queue.add('tracked', {}, { repeat: { pattern: '0 */6 * * *' } });
  await queue.add('snapshot', {}, { repeat: { pattern: '0 0 * * *' } });
  console.log('Scheduled jobs registered.');
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`Processing job: ${job.name}`);
    switch (job.name) {
      case 'fetch':
      case 'score':
        await runFetchPipeline();
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
setupSchedules(queue).catch(console.error);

console.log('Worker started. Waiting for jobs...');
