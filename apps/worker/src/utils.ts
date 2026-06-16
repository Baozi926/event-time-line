import { createHash } from 'node:crypto';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .replace(/-+$/, '') || `event-${Date.now()}`;
}

export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'fbclid') {
        u.searchParams.delete(key);
      }
    }
    u.hash = '';
    let result = u.toString();
    if (result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return url;
  }
}

export function parseGdeltDate(seendate: string | undefined | null): Date {
  if (!seendate?.trim()) return new Date();

  const trimmed = seendate.trim();

  if (trimmed.includes('-') || trimmed.includes('T')) {
    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  // GDELT format: YYYYMMDDHHMMSS (may be truncated)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 8) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const h = digits.slice(8, 10) || '00';
    const min = digits.slice(10, 12) || '00';
    const s = digits.slice(12, 14) || '00';
    const parsed = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

export function toIsoStringSafe(date: Date, fallback = new Date()): string {
  const target = Number.isNaN(date.getTime()) ? fallback : date;
  return target.toISOString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export function clusterKeyFromTitle(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .sort()
    .join('-');
  return createHash('md5').update(words || title).digest('hex');
}

export function buildGdeltQuery(keywords: string[]): string {
  if (keywords.length === 0) return '';
  if (keywords.length === 1) return `"${keywords[0]}"`;
  return `(${keywords.map((k) => `"${k}"`).join(' OR ')})`;
}
