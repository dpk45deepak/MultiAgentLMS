'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'An account with this email already exists.'
          : 'We couldn\u2019t create your account. Please try again.'
      );
      return;
    }

    setSubmitted(true);
  }

  async function resend() {
    setResending(true);
    setResendNotice(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    setResending(false);
    setResendNotice(
      resendError ? 'We couldn\u2019t resend right now. Please try again in a minute.' : 'Sent! Check your inbox (and spam).'
    );
  }

  if (submitted) {
    return (
      <AuthCard
        title="Check your inbox"
        description="Almost there."
        footer={{ text: 'Wrong email?', linkText: 'Try again', href: '/register' }}
      >
        <p className="text-sm text-ink-soft">
          We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click it to
          activate your account &mdash; you&rsquo;ll be signed in automatically. (If you open it on a
          different device, just log in there afterwards.)
        </p>
        {resendNotice && <p className="mt-3 text-sm font-semibold text-[#388E3C]">{resendNotice}</p>}
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={resend} disabled={resending}>
          {resending ? 'Sending\u2026' : 'Resend confirmation email'}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      description="Free to start — no credit card."
      footer={{ text: 'Already have an account?', linkText: 'Log in', href: '/login' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-ink-faint">At least 8 characters.</p>
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Creating account\u2026' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
