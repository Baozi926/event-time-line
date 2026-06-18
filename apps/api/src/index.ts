import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
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
import { authRoutes } from './routes/auth.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { topicSubscriptionRoutes } from './routes/topic-subscriptions.js';
import { keywordSubscriptionRoutes } from './routes/keyword-subscriptions.js';
import { attachUser } from './auth/middleware.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const port = Number(process.env.API_PORT ?? 3001);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: webOrigin,
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.SESSION_SECRET ?? 'dev-session-secret-change-me',
});

app.addHook('onRequest', async (req) => {
  await attachUser(req);
});

await app.register(swagger, {
  openapi: {
    info: {
      title: '拾光纪 API',
      description: '热点事件历史 API',
      version: '0.1.0',
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(authRoutes);
await app.register(subscriptionRoutes);
await app.register(topicSubscriptionRoutes);
await app.register(keywordSubscriptionRoutes);
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
