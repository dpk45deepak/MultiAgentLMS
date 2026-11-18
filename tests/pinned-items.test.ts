import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPinnedItems,
  pinTaskbarItem,
  unpinTaskbarItem,
  isTaskbarItemPinned,
  toggleTaskbarItem,
  TASKBAR_STORAGE_KEY,
} from '@/lib/hooks/use-pinned-items';

class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('Pinned Items Storage & Helpers', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
    (globalThis as unknown as { window: unknown }).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  it('starts empty when localStorage is clear', () => {
    expect(getPinnedItems()).toEqual([]);
    expect(isTaskbarItemPinned('/learn/topic-1')).toBe(false);
  });

  it('pins an item and persists to localStorage', () => {
    const items = pinTaskbarItem({
      id: 'note-1',
      title: 'Python Notes',
      type: 'notes',
      href: '/learn/topic-1',
      badge: 'Python',
    });

    expect(items.length).toBe(1);
    expect(isTaskbarItemPinned('/learn/topic-1')).toBe(true);
    expect(getPinnedItems()[0].title).toBe('Python Notes');
    expect(getPinnedItems()[0].type).toBe('notes');
  });

  it('does not duplicate items with identical href', () => {
    pinTaskbarItem({
      id: 'note-1',
      title: 'Python Notes',
      type: 'notes',
      href: '/learn/topic-1',
    });
    const items = pinTaskbarItem({
      id: 'note-1-duplicate',
      title: 'Python Notes Again',
      type: 'notes',
      href: '/learn/topic-1',
    });

    expect(items.length).toBe(1);
  });

  it('unpins an item by id or href', () => {
    pinTaskbarItem({
      id: 'quiz-1',
      title: 'Math Quiz',
      type: 'assessment',
      href: '/assessment/quiz-1',
    });

    expect(isTaskbarItemPinned('/assessment/quiz-1')).toBe(true);

    const remaining = unpinTaskbarItem('quiz-1');
    expect(remaining.length).toBe(0);
    expect(isTaskbarItemPinned('/assessment/quiz-1')).toBe(false);
  });

  it('toggles pin state correctly', () => {
    const item = {
      id: 'mentor-1',
      title: 'AI Mentor Session',
      type: 'mentor' as const,
      href: '/mentor',
    };

    toggleTaskbarItem(item);
    expect(isTaskbarItemPinned('/mentor')).toBe(true);

    toggleTaskbarItem(item);
    expect(isTaskbarItemPinned('/mentor')).toBe(false);
  });
});
