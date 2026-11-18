'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      if (/email not confirmed/i.test(signInError.message)) {
        setUnconfirmed(true);
        setError('Please confirm your email first. We sent you a link when you signed up.');
      } else if (signInError.message === 'Invalid login credentials') {
        setError('That email and password combination doesn\u2019t match our records.');
      } else {
        setError('We couldn\u2019t log you in. Please try again in a moment.');
      }
      return;
    }

    // Keep the button disabled while navigating (no double submits).
    router.push(next);
    router.refresh();
  }

  async function resendConfirmation() {
    setError(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (resendError) setError('We couldn\u2019t resend the email right now. Please try again in a minute.');
    else setNotice(`We sent a new confirmation link to ${email}.`);
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to pick up where you left off."
      footer={{ text: 'New here?', linkText: 'Create an account', href: '/register' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        {notice && <Alert>{notice}</Alert>}
        {unconfirmed && email && (
          <Button type="button" variant="outline" size="sm" onClick={resendConfirmation}>
            Resend confirmation email
          </Button>
        )}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-bold text-[#2A66A3] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Logging in\u2026' : 'Log in'}
        </Button>
        <div className="flex items-center gap-3 text-xs font-semibold text-navy-muted">
          <span className="h-px flex-1 bg-[#D7EAFB]" /> or <span className="h-px flex-1 bg-[#D7EAFB]" />
        </div>
        <GoogleButton next={next} onError={setError} />
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
