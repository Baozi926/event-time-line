import type { FastifyInstance } from 'fastify';

import {

  parseDataSourcesSettings,

} from '@event-time-line/shared';

import {

  readDeepSeekApiKey,

  readEmbeddingApiKey,

  readDataSourcesSettings,

  writeDeepSeekApiKey,

  writeEmbeddingApiKey,

  writeDataSourcesSettings,

} from '../services/data-sources-settings.js';

import { requireAdmin } from '../auth/middleware.js';



export async function dataSourcesSettingsRoutes(app: FastifyInstance) {

  app.get('/api/v1/settings/data-sources', {

    schema: { tags: ['settings'] },

  }, async () => {

    return readDataSourcesSettings();

  });



  app.put('/api/v1/settings/data-sources', {

    schema: { tags: ['settings'] },

  }, async (req, reply) => {

    if (!requireAdmin(req, reply)) return;



    const parsed = parseDataSourcesSettings(req.body);

    if (!parsed) {

      return reply.status(400).send({ error: '无效的数据源配置' });

    }



    const { updatedAt } = await writeDataSourcesSettings(parsed);

    const [deepSeekApiKey, embeddingApiKey, full] = await Promise.all([

      readDeepSeekApiKey(),

      readEmbeddingApiKey(),

      readDataSourcesSettings(),

    ]);



    return {

      settings: parsed,

      updatedAt,

      valyuApiKeyConfigured: Boolean(process.env.VALYU_API_KEY?.trim()),

      deepSeekApiKeyConfigured: Boolean(deepSeekApiKey),

      embeddingApiKeyConfigured: Boolean(embeddingApiKey),

      embeddingServiceReachable: full.embeddingServiceReachable,

      message: '数据源配置已保存，下次采集任务将使用新配置；热榜调度约 30 秒内生效',

    };

  });



  app.put('/api/v1/settings/deepseek-api-key', {

    schema: {

      tags: ['settings'],

      body: {

        type: 'object',

        required: ['apiKey'],

        properties: {

          apiKey: { type: 'string' },

        },

      },

    },

  }, async (req, reply) => {

    if (!requireAdmin(req, reply)) return;



    const { apiKey } = req.body as { apiKey?: string };

    if (typeof apiKey !== 'string') {

      return reply.status(400).send({ error: '无效的 DeepSeek API Key' });

    }



    await writeDeepSeekApiKey(apiKey);



    return {

      deepSeekApiKeyConfigured: Boolean(apiKey.trim()),

      message: apiKey.trim()

        ? 'DeepSeek API Key 已保存'

        : 'DeepSeek API Key 已清除',

    };

  });



  app.put('/api/v1/settings/embedding-api-key', {

    schema: {

      tags: ['settings'],

      body: {

        type: 'object',

        required: ['apiKey'],

        properties: {

          apiKey: { type: 'string' },

        },

      },

    },

  }, async (req, reply) => {

    if (!requireAdmin(req, reply)) return;



    const { apiKey } = req.body as { apiKey?: string };

    if (typeof apiKey !== 'string') {

      return reply.status(400).send({ error: '无效的 Embedding API Key' });

    }



    await writeEmbeddingApiKey(apiKey);



    return {

      embeddingApiKeyConfigured: Boolean(apiKey.trim()),

      message: apiKey.trim()

        ? 'Embedding API Key 已保存'

        : 'Embedding API Key 已清除',

    };

  });

}

