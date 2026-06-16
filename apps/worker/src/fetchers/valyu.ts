import { Valyu } from 'valyu-js';
import {
  getEnabledValyuQueries,
  type ValyuSourceSettings,
} from '@event-time-line/shared';
import type { RawArticle } from '@event-time-line/shared';
import { extractDomain, sleep, toIsoStringSafe } from '../utils.js';
import { loadDataSourcesSettings } from '../services/data-sources-settings.js';

export interface ValyuQueryResult {
  query: string;
  categoryHint: string;
  articles: RawArticle[];
  error?: string;
}

let valyuClient: Valyu | null = null;

export function isValyuConfigured(): boolean {
  return Boolean(process.env.VALYU_API_KEY?.trim());
}

function getValyuClient(): Valyu {
  if (!valyuClient) {
    const apiKey = process.env.VALYU_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('VALYU_API_KEY is not set');
    }
    valyuClient = new Valyu(apiKey);
  }
  return valyuClient;
}

function getStartDate(lookbackDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() - lookbackDays);
  return date.toISOString().split('T')[0];
}

function parsePublishedDate(dateValue: unknown): string | undefined {
  if (!dateValue) return undefined;
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return dateValue.toISOString();
  }
  if (typeof dateValue === 'number') {
    const timestamp = dateValue > 1e12 ? dateValue : dateValue * 1000;
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return undefined;
}

async function fetchValyuQuery(
  query: string,
  categoryHint: string,
  config: ValyuSourceSettings,
): Promise<RawArticle[]> {
  const valyu = getValyuClient();
  const now = new Date().toISOString();

  const response = await valyu.search(query, {
    searchType: 'news',
    maxNumResults: config.maxResults,
    startDate: getStartDate(config.lookbackDays),
    excludeSources: ['wikipedia.org'],
    isToolCall: false,
  });

  if (!response.success) {
    const msg = response.error ?? 'Valyu search failed';
    if (msg.toLowerCase().includes('credit') || msg.includes('402')) {
      throw new Error(`Valyu credits: ${msg}`);
    }
    throw new Error(msg);
  }

  return (response.results ?? [])
    .filter((result) => result.url && result.title)
    .map((result) => {
      const url = result.url!;
      const content =
        typeof result.content === 'string' ? result.content : '';
      return {
        sourceType: 'valyu' as const,
        externalId: url,
        url,
        title: result.title!.trim(),
        domain: extractDomain(url),
        language: 'en',
        publishedAt: parsePublishedDate(result.date ?? result.publication_date) ?? now,
        snippet: content.slice(0, 500) || undefined,
        categoryHint,
        fetchedAt: now,
      };
    });
}

export async function fetchAllValyu(
  valyuSettings?: ValyuSourceSettings,
): Promise<ValyuQueryResult[]> {
  if (!isValyuConfigured()) {
    return [];
  }

  const { settings } = await loadDataSourcesSettings();
  const config = valyuSettings ?? settings.valyu;

  if (!config.enabled) {
    console.log('[valyu] Skipped (disabled in data source settings)');
    return [];
  }

  const queries = getEnabledValyuQueries(config);
  const results: ValyuQueryResult[] = [];

  for (let i = 0; i < queries.length; i++) {
    const queryConfig = queries[i];
    try {
      const articles = await fetchValyuQuery(
        queryConfig.query,
        queryConfig.categoryHint,
        config,
      );
      results.push({
        query: queryConfig.query,
        categoryHint: queryConfig.categoryHint,
        articles,
      });
      console.log(
        `[valyu] "${queryConfig.query.slice(0, 40)}…" → ${articles.length} articles`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Valyu fetch error [${queryConfig.query}]:`, err);
      results.push({
        query: queryConfig.query,
        categoryHint: queryConfig.categoryHint,
        articles: [],
        error: message,
      });

      if (message.toLowerCase().includes('credit')) {
        console.warn('[valyu] Stopping remaining queries due to credit error');
        break;
      }
    }

    if (i < queries.length - 1) {
      await sleep(config.queryDelayMs);
    }
  }

  return results;
}
