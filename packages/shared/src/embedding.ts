export const EMBEDDING_API_KEY_SETTINGS_KEY = 'embedding_api_key';
export const EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingProvider = 'local' | 'api';

export interface EmbeddingLocalSettings {
  baseUrl: string;
  model: string;
}

export interface EmbeddingApiSettings {
  baseUrl: string;
  model: string;
}

export interface EmbeddingSettings {
  /** Enables vector semantic search and event embedding. */
  enabled: boolean;
  provider: EmbeddingProvider;
  dimensions: number;
  minSimilarity: number;
  local: EmbeddingLocalSettings;
  api: EmbeddingApiSettings;
}

export function formatVectorForPg(vector: number[]): string {
  return `[${vector.map((v) => Number(v).toFixed(8)).join(',')}]`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
