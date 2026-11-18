import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { redirect } from 'next/navigation';
import { ErrorState } from '@/components/ui/error-state';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile, error: profileError }, { data: preferences, error: prefsError }] = await Promise.all([
    supabase.from('profiles').select('display_name, tutor_display_name, mentor_display_name').eq('id', user.id).single(),
    supabase
      .from('user_preferences')
      .select('preferred_difficulty, explanation_style, preferred_language')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if ((profileError && profileError.code !== 'PGRST116') || prefsError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B9D9F5]/40 px-3 py-1 text-xs font-semibold text-navy border border-[#8EBBE3]">
          <span className="text-xs">⚙️</span>
          CONTROL PANEL &bull; SETTINGS.INI
        </span>
      </div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-navy">Preferences &amp; Profile</h1>
      <p className="mt-1 mb-8 text-sm text-navy-muted">
        Personalize your AI Tutor and AI Mentor personas, study pacing, and workspace options.
      </p>
      <SettingsForm
        initial={{
          email: user.email ?? '',
          displayName: profile?.display_name ?? '',
          tutorDisplayName: profile?.tutor_display_name ?? 'AI Tutor',
          mentorDisplayName: profile?.mentor_display_name ?? 'AI Mentor',
          preferredDifficulty: preferences?.preferred_difficulty ?? 'medium',
          explanationStyle: preferences?.explanation_style ?? 'normal',
          preferredLanguage: preferences?.preferred_language ?? 'english',
        }}
      />
    </div>
  );
}

