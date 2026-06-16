import { query } from '@event-time-line/database';
import {
  DATA_SOURCES_SETTINGS_KEY,
  DEFAULT_DATA_SOURCES_SETTINGS,
  mergeDataSourcesSettings,
  parseDataSourcesSettings,
  type DataSourcesSettings,
} from '@event-time-line/shared';

export async function loadDataSourcesSettings(): Promise<{
  settings: DataSourcesSettings;
  updatedAt: string;
}> {
  const res = await query<{ value: unknown; updated_at: Date }>(
    `SELECT value, updated_at FROM app_settings WHERE key = $1`,
    [DATA_SOURCES_SETTINGS_KEY],
  );

  if (res.rows.length === 0) {
    return {
      settings: DEFAULT_DATA_SOURCES_SETTINGS,
      updatedAt: new Date(0).toISOString(),
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
  };
}
