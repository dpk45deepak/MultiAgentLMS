import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SettingsUpdateSchema } from '@/lib/validation/schemas';
import { parseJsonBody } from '@/lib/validation/api';

/**
 * Feature 2 — Settings.
 *
 * GET returns the authenticated user's own profile + preference row.
 * PATCH updates only the keys present in the body, scoped to the
 * authenticated user's own rows. RLS on `profiles` and `user_preferences`
 * (schema.sql) already prevents cross-user writes at the database layer —
 * the explicit `.eq('id', user.id)` / `.eq('user_id', user.id)` filters here
 * are defense-in-depth, not the only guard.
 */

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const [{ data: profile, error: profileError }, { data: preferences, error: prefsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, tutor_display_name, mentor_display_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_preferences')
      .select('preferred_difficulty, explanation_style, preferred_language')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 });
  }
  if (prefsError) {
    return NextResponse.json({ error: 'Could not load your preferences.' }, { status: 500 });
  }

  return NextResponse.json({
    displayName: profile.display_name,
    tutorDisplayName: profile.tutor_display_name,
    mentorDisplayName: profile.mentor_display_name,
    email: user.email,
    // user_preferences is seeded by the signup trigger for every user, but
    // fall back to sensible defaults defensively in case a row is somehow
    // missing (e.g. a user created before the trigger existed).
    preferredDifficulty: preferences?.preferred_difficulty ?? 'medium',
    explanationStyle: preferences?.explanation_style ?? 'normal',
    preferredLanguage: preferences?.preferred_language ?? 'english',
  });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const parsedBody = await parseJsonBody(request, SettingsUpdateSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = { success: true as const, data: parsedBody.data };

  const { displayName, tutorDisplayName, mentorDisplayName, preferredDifficulty, explanationStyle, preferredLanguage, timezone } =
    parsed.data;

  const profileUpdate: Record<string, string> = {};
  if (displayName !== undefined) profileUpdate.display_name = displayName;
  if (tutorDisplayName !== undefined) profileUpdate.tutor_display_name = tutorDisplayName;
  if (mentorDisplayName !== undefined) profileUpdate.mentor_display_name = mentorDisplayName;
  if (timezone !== undefined) profileUpdate.timezone = timezone;

  const preferencesUpdate: Record<string, string> = {};
  if (preferredDifficulty !== undefined) preferencesUpdate.preferred_difficulty = preferredDifficulty;
  if (explanationStyle !== undefined) preferencesUpdate.explanation_style = explanationStyle;
  if (preferredLanguage !== undefined) preferencesUpdate.preferred_language = preferredLanguage;

  if (Object.keys(profileUpdate).length === 0 && Object.keys(preferencesUpdate).length === 0) {
    return NextResponse.json({ error: 'No changes to save.' }, { status: 400 });
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update({ ...profileUpdate, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return NextResponse.json({ error: 'Could not save your profile changes.' }, { status: 500 });
  }

  if (Object.keys(preferencesUpdate).length > 0) {
    // upsert (not update): a user row can theoretically be missing if the
    // signup trigger predates this feature — never fail a save because of
    // that, just create the row.
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, ...preferencesUpdate, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) return NextResponse.json({ error: 'Could not save your preferences.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
