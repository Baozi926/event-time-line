import { EMBEDDING_DIMENSIONS, type EmbeddingSettings } from './embedding.js';

interface EmbeddingApiResponse {
  data?: Array<{ embedding?: number[] }>;
}

function resolveEmbeddingsUrl(settings: EmbeddingSettings): string {
  const base = settings.provider === 'local'
    ? settings.local.baseUrl
    : settings.api.baseUrl;
  const normalized = base.replace(/\/$/, '');
  // Local FastAPI service exposes /v1/embeddings; OpenAI-compatible APIs use baseUrl ending in /v1 + /embeddings.
  const path = settings.provider === 'local' ? '/v1/embeddings' : '/embeddings';
  return `${normalized}${path}`;
}

export async function createEmbeddings(
  texts: string[],
  settings: EmbeddingSettings,
  apiKey?: string | null,
): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  const url = resolveEmbeddingsUrl(settings);
  const model = settings.provider === 'local'
    ? settings.local.model
    : settings.api.model;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.provider === 'api' && apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const body: Record<string, unknown> = {
    model,
    input: texts.length === 1 ? texts[0] : texts,
    dimensions: EMBEDDING_DIMENSIONS,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[embedding] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as EmbeddingApiResponse;
    const vectors = (data.data ?? [])
      .map((item) => item.embedding)
      .filter((vec): vec is number[] => Array.isArray(vec) && vec.length > 0);

    if (vectors.length !== texts.length) {
      console.warn(`[embedding] expected ${texts.length} vectors, got ${vectors.length}`);
      return null;
    }

    return vectors;
  } catch (err) {
    console.warn('[embedding] request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function checkEmbeddingServiceReachable(
  settings: EmbeddingSettings,
): Promise<boolean> {
  const base = settings.provider === 'local'
    ? settings.local.baseUrl
    : settings.api.baseUrl;

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
