'use client';

import { useEffect, useRef } from 'react';
import {
  consumeListScroll,
  type ListScrollPayload,
} from '@/lib/listScrollRestore';

const HIGHLIGHT_CLASS = ['ring-2', 'ring-brand-300', 'border-brand-200'] as const;

function highlightElement(el: HTMLElement) {
  el.classList.add(...HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    el.classList.remove(...HIGHLIGHT_CLASS);
  }, 2000);
}

function restoreScroll(payload: ListScrollPayload, domIdPrefix: string) {
  window.scrollTo({ top: payload.scrollY, left: 0, behavior: 'auto' });
  const el = document.getElementById(`${domIdPrefix}${payload.itemId}`);
  if (el) highlightElement(el);
}

export function useListScrollRestore<T>({
  storageKey,
  listPath,
  items,
  getItemId,
  domIdPrefix,
  hasMore,
  loading,
  loadMore,
}: {
  storageKey: string;
  listPath: string;
  items: T[];
  getItemId: (item: T) => string;
  domIdPrefix: string;
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
}) {
  const pendingRef = useRef<ListScrollPayload | null>(null);
  const consumedRef = useRef(false);
  const getItemIdRef = useRef(getItemId);
  getItemIdRef.current = getItemId;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    const saved = consumeListScroll(storageKey, listPath);
    if (saved) pendingRef.current = saved;
  }, [storageKey, listPath]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    const itemIds = new Set(items.map((item) => getItemIdRef.current(item)));
    const targetInList = itemIds.has(pending.itemId);
    const el = document.getElementById(`${domIdPrefix}${pending.itemId}`);

    if (el) {
      requestAnimationFrame(() => {
        restoreScroll(pending, domIdPrefix);
        pendingRef.current = null;
      });
      return;
    }

    if (!targetInList && hasMore && !loading) {
      loadMore();
      return;
    }

    if (!hasMore && !loading) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: pending.scrollY, left: 0, behavior: 'auto' });
        pendingRef.current = null;
      });
    }
  }, [items, hasMore, loading, loadMore, domIdPrefix]);
}
