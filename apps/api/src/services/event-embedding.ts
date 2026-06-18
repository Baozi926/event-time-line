import { query } from '@event-time-line/database';
import { createEmbeddings, formatVectorForPg } from '@event-time-line/shared';
import { readDataSourcesSettings, readEmbeddingApiKey } from './data-sources-settings.js';

export type GenerateEventEmbeddingError =
  | 'disabled'
  | 'not_found'
  | 'already_exists'
  | 'no_api_key'
  | 'service_unreachable'
  | 'failed';

const ERROR_MESSAGES: Record<GenerateEventEmbeddingError, string> = {
  disabled: '语义向量功能未启用，请先在系统设置中开启',
  not_found: '事件不存在',
  already_exists: '语义向量已存在',
  no_api_key: '远程 embedding API 未配置 Key',
  service_unreachable: 'embedding 服务不可达，请确认本地服务已启动',
  failed: '向量生成失败，请稍后重试',
};

export async function generateEventEmbedding(
  eventId: string,
  options?: { force?: boolean },
): Promise<{ ok: true } | { ok: false; code: GenerateEventEmbeddingError; message: string }> {
  const { settings } = await readDataSourcesSettings();

  if (!settings.embedding.enabled) {
    return { ok: false, code: 'disabled', message: ERROR_MESSAGES.disabled };
  }

  const eventRes = await query<{ title: string; has_embedding: boolean }>(
    `SELECT title, embedding IS NOT NULL AS has_embedding FROM events WHERE id = $1`,
    [eventId],
  );

  if (!eventRes.rows[0]) {
    return { ok: false, code: 'not_found', message: ERROR_MESSAGES.not_found };
  }

  if (eventRes.rows[0].has_embedding && !options?.force) {
    return { ok: false, code: 'already_exists', message: ERROR_MESSAGES.already_exists };
  }

  const apiKey =
    settings.embedding.provider === 'api' ? await readEmbeddingApiKey() : null;

  if (settings.embedding.provider === 'api' && !apiKey) {
    return { ok: false, code: 'no_api_key', message: ERROR_MESSAGES.no_api_key };
  }

  const vectors = await createEmbeddings(
    [eventRes.rows[0].title.slice(0, 300)],
    settings.embedding,
    apiKey,
  );

  if (!vectors?.[0]) {
    return {
      ok: false,
      code:
        settings.embedding.provider === 'local' ? 'service_unreachable' : 'failed',
      message:
        settings.embedding.provider === 'local'
          ? ERROR_MESSAGES.service_unreachable
          : ERROR_MESSAGES.failed,
    };
  }

  if (options?.force) {
    await query(`UPDATE events SET embedding = NULL WHERE id = $1`, [eventId]);
  }

  await query(
    `UPDATE events SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
    [formatVectorForPg(vectors[0]), eventId],
  );

  return { ok: true };
}
