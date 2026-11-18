'use client';

import { useState, useEffect, useCallback } from 'react';

export type PinnedItemType = 'notes' | 'tutor' | 'assessment' | 'mentor';

export interface PinnedItem {
  id: string;
  title: string;
  type: PinnedItemType;
  href: string;
  badge?: string;
  pinnedAt: number;
}

/**
 * Pins live in the database (`pinned_items`, RLS-protected, synced across
 * devices). localStorage is only a per-user cache so the taskbar renders
 * instantly: the key includes the user id, so two accounts on one browser
 * never see each other's pins.
 */
export const TASKBAR_STORAGE_KEY = 'haru_taskbar_pinned_items';
export const TASKBAR_EVENT_KEY = 'haru:pinned-items-updated';

let activeUserId: string | null = null;
let syncPromise: Promise<void> | null = null;

/** Scopes the local cache to a user (null falls back to the unscoped key). */
export function setPinnedItemsUser(userId: string | null) {
  if (activeUserId !== userId) syncPromise = null;
  activeUserId = userId;
}

function storageKey(): string {
  return activeUserId ? `${TASKBAR_STORAGE_KEY}:${activeUserId}` : TASKBAR_STORAGE_KEY;
}

export function getPinnedItems(): PinnedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePinnedItems(items: PinnedItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(items));
    window.dispatchEvent(new Event(TASKBAR_EVENT_KEY));
  } catch {
    // quota exceeded or private mode
  }
}

export function isTaskbarItemPinned(href: string): boolean {
  return getPinnedItems().some((item) => item.href === href);
}

export function pinTaskbarItem(item: Omit<PinnedItem, 'pinnedAt'>): PinnedItem[] {
  const current = getPinnedItems();
  if (current.some((i) => i.href === item.href)) return current;
  const next: PinnedItem[] = [
    ...current,
    {
      ...item,
      pinnedAt: Date.now(),
    },
  ];
  savePinnedItems(next);
  return next;
}

export function unpinTaskbarItem(idOrHref: string): PinnedItem[] {
  const current = getPinnedItems();
  const next = current.filter((i) => i.id !== idOrHref && i.href !== idOrHref);
  savePinnedItems(next);
  return next;
}

export function toggleTaskbarItem(item: Omit<PinnedItem, 'pinnedAt'>): PinnedItem[] {
  if (isTaskbarItemPinned(item.href)) {
    return unpinTaskbarItem(item.href);
  } else {
    return pinTaskbarItem(item);
  }
}

async function pushToServer(method: 'POST' | 'DELETE', payload: Record<string, unknown>) {
  try {
    const res = await fetch('/api/pins', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Replaces the local cache with the server's list (the source of truth). Runs once per page load. */
function syncFromServer(): Promise<void> {
  if (!syncPromise) {
    syncPromise = fetch('/api/pins')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items)) savePinnedItems(data.items as PinnedItem[]);
      })
      .catch(() => {
        syncPromise = null; // allow a retry on the next mount
      });
  }
  return syncPromise;
}

export function usePinnedItems() {
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const { data } = await createClient().auth.getUser();
        if (cancelled) return;
        setPinnedItemsUser(data.user?.id ?? null);
        setPinnedItems(getPinnedItems());
        if (data.user) await syncFromServer();
      } catch {
        /* offline: fall back to the cache */
      }
      if (!cancelled) setPinnedItems(getPinnedItems());
    }
    init();

    function handleUpdate() {
      setPinnedItems(getPinnedItems());
    }

    window.addEventListener(TASKBAR_EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(TASKBAR_EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isPinned = useCallback((href: string) => isTaskbarItemPinned(href), []);

  const pinItem = useCallback(async (item: Omit<PinnedItem, 'pinnedAt'>) => {
    pinTaskbarItem(item); // optimistic
    const ok = await pushToServer('POST', {
      itemKey: item.id,
      title: item.title,
      type: item.type,
      href: item.href,
      badge: item.badge,
    });
    if (!ok) {
      unpinTaskbarItem(item.href); // revert: the server did not accept it
    }
  }, []);

  const unpinItem = useCallback(async (idOrHref: string) => {
    const existing = getPinnedItems().find((i) => i.id === idOrHref || i.href === idOrHref);
    unpinTaskbarItem(idOrHref); // optimistic
    if (!existing) return;
    const ok = await pushToServer('DELETE', { itemKey: existing.id });
    if (!ok) pinTaskbarItem({ id: existing.id, title: existing.title, type: existing.type, href: existing.href, badge: existing.badge });
  }, []);

  const togglePin = useCallback(
    async (item: Omit<PinnedItem, 'pinnedAt'>) => {
      if (isTaskbarItemPinned(item.href)) await unpinItem(item.href);
      else await pinItem(item);
    },
    [pinItem, unpinItem]
  );

  return {
    pinnedItems,
    isPinned,
    pinItem,
    unpinItem,
    togglePin,
  };
}
