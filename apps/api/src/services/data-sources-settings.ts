import { query } from '@event-time-line/database';
import {
  DATA_SOURCES_SETTINGS_KEY,
  DEFAULT_DATA_SOURCES_SETTINGS,
  mergeDataSourcesSettings,
  parseDataSourcesSettings,
  type DataSourcesSettings,
} from '@event-time-line/shared';

export async function readDataSourcesSettings(): Promise<{
  settings: DataSourcesSettings;
  updatedAt: string;
  valyuApiKeyConfigured: boolean;
}> {
  const res = await query<{ value: unknown; updated_at: Date }>(
    `SELECT value, updated_at FROM app_settings WHERE key = $1`,
    [DATA_SOURCES_SETTINGS_KEY],
  );

  if (res.rows.length === 0) {
    return {
      settings: DEFAULT_DATA_SOURCES_SETTINGS,
      updatedAt: new Date(0).toISOString(),
      valyuApiKeyConfigured: Boolean(process.env.VALYU_API_KEY?.trim()),
    };
  }

  const row = res.rows[0];
  const parsed = parseDataSourcesSettings(row.value);
  const settings = parsed
    ? mergeDataSourcesSettings(parsed)
    : DEFAULT_DATA_SOURCES_SETTINGS;

  return {
    settings,
    updatedAt: row.updated_at.toISOString(),
    valyuApiKeyConfigured: Boolean(process.env.VALYU_API_KEY?.trim()),
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
