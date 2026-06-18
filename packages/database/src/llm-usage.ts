import { query } from './client.js';

export async function recordLlmUsage(
  provider: string,
  operation: string,
  options?: { success?: boolean },
): Promise<void> {
  const success = options?.success !== false;
  try {
    await query(
      `INSERT INTO llm_usage_daily (usage_date, provider, operation, call_count, error_count)
       VALUES (CURRENT_DATE, $1, $2, 1, $3)
       ON CONFLICT (usage_date, provider, operation) DO UPDATE SET
         call_count = llm_usage_daily.call_count + 1,
         error_count = llm_usage_daily.error_count + EXCLUDED.error_count`,
      [provider, operation, success ? 0 : 1],
    );
  } catch (err) {
    console.warn(
      '[llm-usage] failed to record usage:',
      err instanceof Error ? err.message : err,
    );
  }
}
