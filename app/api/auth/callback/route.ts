import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';

function loginError(origin: string, message: string) {
  const url = new URL('/login', origin);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

function friendlyExchangeError(message: string): string {
  // The PKCE verifier lives in a cookie on the device that *started* the flow.
  if (/code verifier|code_verifier|invalid flow state|flow state/i.test(message)) {
    return 'That link was opened on a different device or browser than the one you started on. If you already confirmed your email, just log in below.';
  }
  if (/expired|invalid/i.test(message)) {
    return 'That link is invalid or has expired. Please request a new one.';
  }
  return 'We couldn\u2019t sign you in with that link. Please try logging in again.';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get('code');
  const providerError = requestUrl.searchParams.get('error_description') ?? requestUrl.searchParams.get('error');
  const next = safeRedirectPath(requestUrl.searchParams.get('next'));

  if (providerError) return loginError(origin, friendlyExchangeError(providerError));
  if (!code) return loginError(origin, 'That sign-in link is missing its code. Please try again.');

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginError(origin, friendlyExchangeError(error.message));

  return NextResponse.redirect(new URL(next, origin));
}
