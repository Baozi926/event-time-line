import type { FastifyInstance } from 'fastify';
import {
  parseDataSourcesSettings,
} from '@event-time-line/shared';
import {
  readDataSourcesSettings,
  writeDataSourcesSettings,
} from '../services/data-sources-settings.js';

export async function dataSourcesSettingsRoutes(app: FastifyInstance) {
  app.get('/api/v1/settings/data-sources', {
    schema: { tags: ['settings'] },
  }, async () => {
    return readDataSourcesSettings();
  });

  app.put('/api/v1/settings/data-sources', {
    schema: { tags: ['settings'] },
  }, async (req, reply) => {
    const parsed = parseDataSourcesSettings(req.body);
    if (!parsed) {
      return reply.status(400).send({ error: '无效的数据源配置' });
    }

    const { updatedAt } = await writeDataSourcesSettings(parsed);

    return {
      settings: parsed,
      updatedAt,
      valyuApiKeyConfigured: Boolean(process.env.VALYU_API_KEY?.trim()),
      message: '数据源配置已保存，下次采集任务将使用新配置；热榜调度约 30 秒内生效',
    };
  });
}
