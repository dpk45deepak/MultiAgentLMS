'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setLoading(false);
      onError('Google sign-in isn\u2019t available right now. Please use email and password.');
    }
    // On success the browser navigates away to Google.
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={loading} className="w-full">
      {loading ? 'Opening Google\u2026' : 'Continue with Google'}
    </Button>
  );
}
