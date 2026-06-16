export type ListScrollPayload = {
  path: string;
  scrollY: number;
  itemId: string;
};

export function saveListScroll(
  storageKey: string,
  listPath: string,
  itemId: string,
): void {
  if (typeof window === 'undefined') return;
  const payload: ListScrollPayload = {
    path: listPath,
    scrollY: window.scrollY,
    itemId,
  };
  sessionStorage.setItem(storageKey, JSON.stringify(payload));
}

export function consumeListScroll(
  storageKey: string,
  listPath: string,
): ListScrollPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as ListScrollPayload;
    if (payload.path !== listPath) return null;
    sessionStorage.removeItem(storageKey);
    return payload;
  } catch {
    sessionStorage.removeItem(storageKey);
    return null;
  }
}
