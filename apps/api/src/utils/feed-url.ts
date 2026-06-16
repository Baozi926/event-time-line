const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function extractDomainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export function validateFeedUrl(rawUrl: string): { ok: true; url: string } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: '无效的 URL 格式' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: '仅支持 http / https 协议' };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local')) {
    return { ok: false, error: '不允许访问本地或内网地址' };
  }
  if (isPrivateIpv4(host)) {
    return { ok: false, error: '不允许访问内网 IP 地址' };
  }

  parsed.hash = '';
  return { ok: true, url: parsed.toString() };
}

export async function probeFeedUrl(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'EventTimelineBot/0.1 (+https://github.com/event-time-line)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return { ok: false, error: `Feed 请求失败：HTTP ${res.status}` };
    }

    const contentType = res.headers.get('content-type') ?? '';
    const snippet = (await res.text()).trimStart().slice(0, 200).toLowerCase();
    const looksLikeFeed =
      contentType.includes('xml')
      || contentType.includes('rss')
      || contentType.includes('atom')
      || snippet.startsWith('<?xml')
      || snippet.includes('<rss')
      || snippet.includes('<feed');

    if (!looksLikeFeed) {
      return { ok: false, error: 'URL 返回的内容不像 RSS/Atom Feed' };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `无法拉取 Feed：${message}` };
  }
}
