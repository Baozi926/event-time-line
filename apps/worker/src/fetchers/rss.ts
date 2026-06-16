import Parser from 'rss-parser';

import type {

  CollectionRunRssFeedResult,

  RawArticle,

} from '@event-time-line/shared';

import { resolveRssFeedInterval } from '@event-time-line/shared';

import { extractDomain, sleep, toIsoStringSafe } from '../utils.js';

import { loadEnabledRssFeeds, touchRssFeedFetchedAt } from '../services/rss-feeds.js';



const parser = new Parser({

  timeout: 35000,

  headers: {

    'User-Agent': 'EventTimelineBot/0.1 (+https://github.com/event-time-line)',

    Accept: 'application/rss+xml, application/xml, text/xml, */*',

  },

});



export interface RssFetchSummary {

  articles: RawArticle[];

  feeds: CollectionRunRssFeedResult[];

  fetchedCount: number;

  skippedCount: number;

}



export interface RssFetchOptions {

  defaultIntervalMinutes: number;

  /** 手动触发时忽略到期检查，拉取全部已启用 Feed */

  force?: boolean;

}



function isFeedDue(

  lastFetchedAt: string | null | undefined,

  intervalMinutes: number,

): boolean {

  if (!lastFetchedAt) return true;

  const elapsedMs = Date.now() - new Date(lastFetchedAt).getTime();

  return elapsedMs >= intervalMinutes * 60_000;

}



async function parseFeedWithRetry(url: string, name: string, retries = 3) {

  let lastError: Error | undefined;



  for (let attempt = 0; attempt < retries; attempt++) {

    try {

      return await parser.parseURL(url);

    } catch (err) {

      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries - 1) {

        const waitMs = (attempt + 1) * 3000;

        console.warn(`RSS retry [${name}] in ${waitMs}ms (attempt ${attempt + 1})`);

        await sleep(waitMs);

      }

    }

  }



  throw lastError ?? new Error(`RSS fetch failed: ${name}`);

}



export async function fetchDueRss(options: RssFetchOptions): Promise<RssFetchSummary> {

  const articles: RawArticle[] = [];

  const feeds: CollectionRunRssFeedResult[] = [];

  const now = new Date().toISOString();

  const feedRows = await loadEnabledRssFeeds();

  let fetchedCount = 0;

  let skippedCount = 0;



  if (feedRows.length === 0) {

    console.warn('No RSS feeds configured');

    return { articles, feeds, fetchedCount, skippedCount };

  }



  for (const feed of feedRows) {

    const effectiveInterval = resolveRssFeedInterval(

      feed.fetchIntervalMinutes,

      options.defaultIntervalMinutes,

    );



    if (!options.force && !isFeedDue(feed.lastFetchedAt, effectiveInterval)) {

      skippedCount++;

      feeds.push({

        feedId: feed.id,

        feedName: feed.name,

        feedUrl: feed.url,

        status: 'skipped',

        articlesFound: 0,

        skippedReason: `距上次采集不足 ${effectiveInterval} 分钟`,

      });

      continue;

    }



    try {

      const parsed = await parseFeedWithRetry(feed.url, feed.name);

      let articlesFound = 0;



      for (const item of parsed.items ?? []) {

        if (!item.link || !item.title) continue;

        articles.push({
          sourceType: 'rss',
          externalId: item.guid ?? item.link,
          url: item.link,
          title: item.title.trim(),
          domain: feed.domain || extractDomain(item.link),
          language: feed.language || 'en',
          feedUrl: feed.url,

          publishedAt: item.pubDate

            ? toIsoStringSafe(new Date(item.pubDate))

            : now,

          imageUrl: item.enclosure?.url,

          categoryHint: 'rss',

          fetchedAt: now,

        });

        articlesFound++;

      }



      if (feed.id) {

        await touchRssFeedFetchedAt(feed.id);

      }



      fetchedCount++;

      feeds.push({

        feedId: feed.id,

        feedName: feed.name,

        feedUrl: feed.url,

        status: 'completed',

        articlesFound,

      });

    } catch (err) {

      const message = err instanceof Error ? err.message : String(err);

      console.error(`RSS fetch error [${feed.name}]:`, err);



      if (feed.id) {

        await touchRssFeedFetchedAt(feed.id);

      }



      fetchedCount++;

      feeds.push({

        feedId: feed.id,

        feedName: feed.name,

        feedUrl: feed.url,

        status: 'failed',

        articlesFound: 0,

        errorMessage: message.slice(0, 500),

      });

    }



    await sleep(1500);

  }



  return { articles, feeds, fetchedCount, skippedCount };

}



/** @deprecated Use fetchDueRss */

export async function fetchAllRss(): Promise<RssFetchSummary> {

  return fetchDueRss({ defaultIntervalMinutes: 60, force: true });

}


