'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    });
    setLoading(false);
    // Don't reveal whether the address has an account; only surface real failures.
    if (resetError && !/not found|no user/i.test(resetError.message)) {
      setError('We couldn\u2019t send the reset email right now. Please try again in a minute.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your inbox"
        description="Password reset"
        footer={{ text: 'Remembered it?', linkText: 'Log in', href: '/login' }}
      >
        <p className="text-sm text-ink-soft">
          If an account exists for <strong className="text-ink">{email}</strong>, we sent a link to reset your password.
          The link works best when opened on this same device.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="We'll email you a reset link."
      footer={{ text: 'Remembered it?', linkText: 'Log in', href: '/login' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Sending\u2026' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  );
}
