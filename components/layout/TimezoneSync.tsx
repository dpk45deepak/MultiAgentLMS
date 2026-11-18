'use client';

import { useEffect } from 'react';

/**
 * Keeps profiles.timezone in step with the browser so streak days roll over at
 * the learner's own midnight. Runs at most once per browser session and only
 * when the stored value differs.
 */
export function TimezoneSync({ storedTimezone }: { storedTimezone: string | null }) {
  useEffect(() => {
    try {
      const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!browserZone || browserZone === storedTimezone) return;
      if (sessionStorage.getItem('tz-synced') === browserZone) return;
      sessionStorage.setItem('tz-synced', browserZone);
      fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: browserZone }),
      }).catch(() => {
        /* best effort */
      });
    } catch {
      /* Intl/sessionStorage unavailable */
    }
  }, [storedTimezone]);

  return null;
}
