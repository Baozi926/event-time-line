'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Event } from '@event-time-line/shared';
import { EventCard } from '@/components/EventCard';
import { InfiniteScrollFooter } from '@/components/ui/InfiniteScrollFooter';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useListScrollRestore } from '@/hooks/useListScrollRestore';
import { fetchMySubscriptionsClient, LIST_PAGE_SIZE } from '@/lib/api';
import { FOLLOWING_SCROLL_KEY } from '@/lib/followingNavigation';

export function TrackedEventList({
  events: initialEvents,
  total,
  listPath,
  sort = 'heat',
  filters,
}: {
  events: Event[];
  total: number;
  listPath: string;
  sort?: string;
  filters?: { category?: string; country?: string; language?: string };
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

  function handleUntrack(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setTotalCount((prev) => Math.max(0, prev - 1));
  }

  const hasMore = events.length < totalCount;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMySubscriptionsClient({
        sort,
        ...filters,
        limit: LIST_PAGE_SIZE,
        offset: events.length,
      });
      setEvents((prev) => [...prev, ...data.events]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, events.length, sort, filters]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  useListScrollRestore({
    storageKey: FOLLOWING_SCROLL_KEY,
    listPath,
    items: events,
    getItemId: (e) => e.id,
    domIdPrefix: 'event-',
    hasMore,
    loading,
    loadMore,
  });

  return (
    <>
      <div className="grid gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            listPath={listPath}
            onUntrack={handleUntrack}
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
