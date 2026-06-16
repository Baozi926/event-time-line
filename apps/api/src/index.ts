import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { eventRoutes } from './routes/events.js';
import { candidateRoutes } from './routes/candidates.js';
import { collectionRoutes } from './routes/collection.js';
import { rssFeedRoutes } from './routes/rss-feeds.js';
import { statsRoutes } from './routes/stats.js';
import { trackingHistoryRoutes } from './routes/tracking-history.js';
import { hotTrendRoutes } from './routes/hot-trends.js';
import { dataSourcesSettingsRoutes } from './routes/data-sources-settings.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const port = Number(process.env.API_PORT ?? 3001);

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await app.register(swagger, {
  openapi: {
    info: {
      title: 'Event Timeline API',
      description: '热点事件历史 API',
      version: '0.1.0',
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(eventRoutes);
await app.register(candidateRoutes);
await app.register(collectionRoutes);
await app.register(rssFeedRoutes);
await app.register(statsRoutes);
await app.register(trackingHistoryRoutes);
await app.register(hotTrendRoutes);
await app.register(dataSourcesSettingsRoutes);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
