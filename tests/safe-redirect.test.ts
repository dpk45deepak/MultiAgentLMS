import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from '@/lib/safe-redirect';

describe('safeRedirectPath (open-redirect guard)', () => {
  it('accepts same-origin absolute paths, including query strings', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/learn/123?tab=notes')).toBe('/learn/123?tab=notes');
  });

  it('falls back to /dashboard when missing or empty', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
  });

  it('rejects absolute and scheme URLs', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('http://evil.com/x')).toBe('/dashboard');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
    expect(safeRedirectPath('evil.com')).toBe('/dashboard');
  });

  it('rejects protocol-relative and backslash tricks', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\/evil.com')).toBe('/dashboard');
  });

  it('rejects control characters browsers strip (tab/newline smuggling)', () => {
    expect(safeRedirectPath('/\t/evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\n/evil.com')).toBe('/dashboard');
  });

  it('rejects percent-encoded variants, including double encoding', () => {
    expect(safeRedirectPath('/%2Fevil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/%5Cevil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/%252Fevil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/%0a/evil.com')).toBe('/dashboard');
  });

  it('honours a custom fallback', () => {
    expect(safeRedirectPath('//evil.com', '/login')).toBe('/login');
  });
});
