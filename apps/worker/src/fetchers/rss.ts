import Parser from 'rss-parser';
import { RSS_FEEDS } from '@event-time-line/shared';
import type { RawArticle } from '@event-time-line/shared';
import { extractDomain } from '../utils.js';

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'EventTimelineBot/0.1' },
});

export async function fetchAllRss(): Promise<RawArticle[]> {
  const all: RawArticle[] = [];
  const now = new Date().toISOString();

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items ?? []) {
        if (!item.link || !item.title) continue;
        all.push({
          sourceType: 'rss',
          externalId: item.guid ?? item.link,
          url: item.link,
          title: item.title.trim(),
          domain: feed.domain || extractDomain(item.link),
          language: 'en',
          publishedAt: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : now,
          imageUrl: item.enclosure?.url,
          categoryHint: 'rss',
          fetchedAt: now,
        });
      }
    } catch (err) {
      console.error(`RSS fetch error [${feed.name}]:`, err);
    }
  }

  return all;
}
