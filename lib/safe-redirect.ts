/**
 * Open-redirect guard for `?next=` style parameters.
 *
 * Only same-origin, absolute *paths* are accepted: they must start with a
 * single "/" and must not be protocol-relative ("//evil.com"), contain a
 * backslash ("/\evil.com" — browsers treat "\" as "/"), or contain control
 * characters (browsers strip tabs/newlines, so "/\t/evil.com" becomes
 * "//evil.com"). The check is applied to the raw and the percent-decoded
 * value so encoded variants ("%2F%2Fevil.com") don't slip through.
 */
const DEFAULT_REDIRECT = '/dashboard';

function isSafePath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('\\')) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

export function safeRedirectPath(next: string | null | undefined, fallback: string = DEFAULT_REDIRECT): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 2048) return fallback;
  if (!isSafePath(next)) return fallback;

  // Decode (repeatedly, to defeat double-encoding) and re-check.
  let decoded = next;
  for (let i = 0; i < 3; i++) {
    let step: string;
    try {
      step = decodeURIComponent(decoded);
    } catch {
      return fallback;
    }
    if (step === decoded) break;
    decoded = step;
    if (!isSafePath(decoded)) return fallback;
  }

  return next;
}
