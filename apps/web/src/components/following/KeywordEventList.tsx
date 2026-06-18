'use client';

import { useCallback, useEffect, useState } from 'react';
import type { KeywordMatchedEvent } from '@event-time-line/shared';
import { EventCard } from '@/components/EventCard';
import { InfiniteScrollFooter } from '@/components/ui/InfiniteScrollFooter';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { fetchKeywordSubscriptionEventsClient, LIST_PAGE_SIZE } from '@/lib/api';
import { KeywordClassificationBadge } from '@/components/following/KeywordMatchBanner';

export function KeywordEventList({
  events: initialEvents,
  total,
  keyword,
  sort = 'heat',
  listPath = '/?view=keywords',
}: {
  events: KeywordMatchedEvent[];
  total: number;
  keyword?: string;
  sort?: string;
  listPath?: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [totalCount, setTotalCount] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
    setTotalCount(total);
    setError(null);
  }, [initialEvents, total]);

  const hasMore = events.length < totalCount;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKeywordSubscriptionEventsClient({
        keyword,
        sort,
        limit: LIST_PAGE_SIZE,
        offset: events.length,
      });
      setEvents((prev) => [...prev, ...data.events]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, events.length, keyword, sort]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  return (
    <>
      <div className="grid gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            listPath={listPath}
            cornerBadge={
              event.classifications && event.classifications.length > 0 ? (
                <KeywordClassificationBadge classifications={event.classifications} />
              ) : null
            }
          />
        ))}
      </div>
      <InfiniteScrollFooter
        sentinelRef={sentinelRef}
        loading={loading}
        hasMore={hasMore}
        error={error}
        onRetry={loadMore}
        total={totalCount}
      />
    </>
  );
}
