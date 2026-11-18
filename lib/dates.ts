/**
 * Fixed-locale, fixed-timezone date formatting. Using `undefined` as the
 * locale (the runtime default) renders differently on the server and in the
 * browser, which causes React hydration mismatches; these helpers always give
 * the same string for the same instant + timezone.
 */
const LOCALE = 'en-IN';
const DEFAULT_TZ = 'Asia/Kolkata';

function fmt(iso: string | Date, options: Intl.DateTimeFormatOptions, timeZone: string | null | undefined): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: timeZone || DEFAULT_TZ }).format(date);
  } catch {
    return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: DEFAULT_TZ }).format(date);
  }
}

/** "13 Sep" */
export function formatShortDate(iso: string | Date, timeZone?: string | null): string {
  return fmt(iso, { day: 'numeric', month: 'short' }, timeZone);
}

/** "13 Sep 2026" */
export function formatDate(iso: string | Date, timeZone?: string | null): string {
  return fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' }, timeZone);
}

/** "13 Sep 2026, 2:05 pm" */
export function formatDateTime(iso: string | Date, timeZone?: string | null): string {
  return fmt(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }, timeZone);
}
