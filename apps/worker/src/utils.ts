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
    return u.toString();
  } catch {
    return url;
  }
}

export function parseGdeltDate(seendate: string): Date {
  // GDELT format: YYYYMMDDHHMMSS
  const y = seendate.slice(0, 4);
  const m = seendate.slice(4, 6);
  const d = seendate.slice(6, 8);
  const h = seendate.slice(8, 10);
  const min = seendate.slice(10, 12);
  const s = seendate.slice(12, 14);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
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
