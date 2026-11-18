'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setReady(Boolean(data.user)));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirm) return setError('The two passwords don\u2019t match.');

    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(
        /different from the old|same/i.test(updateError.message)
          ? 'Please choose a password you haven\u2019t used before.'
          : 'We couldn\u2019t update your password. Please request a new link and try again.'
      );
      return;
    }
    setDone(true);
    router.push('/dashboard');
    router.refresh();
  }

  if (ready === false) {
    return (
      <AuthCard
        title="Link expired"
        description="We couldn't verify this reset link."
        footer={{ text: 'Need a new one?', linkText: 'Request a reset link', href: '/forgot-password' }}
      >
        <p className="text-sm text-ink-soft">Open the newest email on the same device you requested it from, or ask for a new link.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Make it at least 8 characters."
      footer={{ text: 'Back to', linkText: 'Log in', href: '/login' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading || done || ready === null} className="mt-2">
          {loading || done ? 'Saving\u2026' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
}
