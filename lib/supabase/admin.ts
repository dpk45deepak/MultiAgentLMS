import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role Supabase client — BYPASSES Row Level Security.
 *
 * Server-only: it must never be imported from a client component, and
 * SUPABASE_SERVICE_ROLE_KEY must never be prefixed NEXT_PUBLIC_. Callers
 * must verify the user with `supabase.auth.getUser()` first and scope every
 * query to that `user.id` themselves — RLS does not protect these queries.
 */
export function createServiceRoleClient() {
  if (typeof window !== 'undefined') {
    throw new Error('lib/supabase/admin.ts must never be imported into client-side code.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set on the server.');
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminClient = ReturnType<typeof createServiceRoleClient>;
