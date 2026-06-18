import { query } from '@event-time-line/database';

import {

  checkEmbeddingServiceReachable,

  DATA_SOURCES_SETTINGS_KEY,

  DEEPSEEK_API_KEY_SETTINGS_KEY,

  DEFAULT_DATA_SOURCES_SETTINGS,

  EMBEDDING_API_KEY_SETTINGS_KEY,

  mergeDataSourcesSettings,

  parseDataSourcesSettings,

  type DataSourcesSettings,

} from '@event-time-line/shared';



export async function readDeepSeekApiKey(): Promise<string | null> {

  const res = await query<{ value: unknown }>(

    `SELECT value FROM app_settings WHERE key = $1`,

    [DEEPSEEK_API_KEY_SETTINGS_KEY],

  );

  const value = res.rows[0]?.value;

  if (!value || typeof value !== 'object') return null;

  const apiKey = (value as { apiKey?: unknown }).apiKey;

  return typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;

}



export async function writeDeepSeekApiKey(apiKey: string): Promise<void> {

  const trimmed = apiKey.trim();

  if (!trimmed) {

    await query(`DELETE FROM app_settings WHERE key = $1`, [

      DEEPSEEK_API_KEY_SETTINGS_KEY,

    ]);

    return;

  }



  await query(

    `INSERT INTO app_settings (key, value, updated_at)

     VALUES ($1, $2::jsonb, NOW())

     ON CONFLICT (key) DO UPDATE

     SET value = EXCLUDED.value, updated_at = NOW()`,

    [DEEPSEEK_API_KEY_SETTINGS_KEY, JSON.stringify({ apiKey: trimmed })],

  );

}



export async function readEmbeddingApiKey(): Promise<string | null> {

  const res = await query<{ value: unknown }>(

    `SELECT value FROM app_settings WHERE key = $1`,

    [EMBEDDING_API_KEY_SETTINGS_KEY],

  );

  const value = res.rows[0]?.value;

  if (!value || typeof value !== 'object') return null;

  const apiKey = (value as { apiKey?: unknown }).apiKey;

  return typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : null;

}



export async function writeEmbeddingApiKey(apiKey: string): Promise<void> {

  const trimmed = apiKey.trim();

  if (!trimmed) {

    await query(`DELETE FROM app_settings WHERE key = $1`, [

      EMBEDDING_API_KEY_SETTINGS_KEY,

    ]);

    return;

  }



  await query(

    `INSERT INTO app_settings (key, value, updated_at)

     VALUES ($1, $2::jsonb, NOW())

     ON CONFLICT (key) DO UPDATE

     SET value = EXCLUDED.value, updated_at = NOW()`,

    [EMBEDDING_API_KEY_SETTINGS_KEY, JSON.stringify({ apiKey: trimmed })],

  );

}



export async function readDataSourcesSettings(): Promise<{

  settings: DataSourcesSettings;

  updatedAt: string;

  valyuApiKeyConfigured: boolean;

  deepSeekApiKeyConfigured: boolean;

  embeddingApiKeyConfigured: boolean;

  embeddingServiceReachable: boolean;

}> {

  const res = await query<{ value: unknown; updated_at: Date }>(

    `SELECT value, updated_at FROM app_settings WHERE key = $1`,

    [DATA_SOURCES_SETTINGS_KEY],

  );



  const deepSeekApiKey = await readDeepSeekApiKey();

  const embeddingApiKey = await readEmbeddingApiKey();



  if (res.rows.length === 0) {

    const reachable = await checkEmbeddingServiceReachable(

      DEFAULT_DATA_SOURCES_SETTINGS.embedding,

    );

    return {

      settings: DEFAULT_DATA_SOURCES_SETTINGS,

      updatedAt: new Date(0).toISOString(),

      valyuApiKeyConfigured: Boolean(process.env.VALYU_API_KEY?.trim()),

      deepSeekApiKeyConfigured: Boolean(deepSeekApiKey),

      embeddingApiKeyConfigured: Boolean(embeddingApiKey),

      embeddingServiceReachable: reachable,

    };

  }



  const row = res.rows[0];

  const parsed = parseDataSourcesSettings(row.value);

  const settings = parsed

    ? mergeDataSourcesSettings(parsed)

    : DEFAULT_DATA_SOURCES_SETTINGS;

  const reachable = await checkEmbeddingServiceReachable(settings.embedding);



  return {

    settings,

    updatedAt: row.updated_at.toISOString(),

    valyuApiKeyConfigured: Boolean(process.env.VALYU_API_KEY?.trim()),

    deepSeekApiKeyConfigured: Boolean(deepSeekApiKey),

    embeddingApiKeyConfigured: Boolean(embeddingApiKey),

    embeddingServiceReachable: reachable,

  };

}



export async function writeDataSourcesSettings(

  settings: DataSourcesSettings,

): Promise<{ updatedAt: string }> {

  const res = await query<{ updated_at: Date }>(

    `INSERT INTO app_settings (key, value, updated_at)

     VALUES ($1, $2::jsonb, NOW())

     ON CONFLICT (key) DO UPDATE

     SET value = EXCLUDED.value, updated_at = NOW()

     RETURNING updated_at`,

    [DATA_SOURCES_SETTINGS_KEY, JSON.stringify(settings)],

  );



  return { updatedAt: res.rows[0].updated_at.toISOString() };

}


