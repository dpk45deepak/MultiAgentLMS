import { createClient } from '@/lib/supabase/server';
import { MentorPanel } from '@/components/mentor/MentorPanel';
import { PinButton } from '@/components/ui/pin-button';
import { ErrorState } from '@/components/ui/error-state';

export default async function MentorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('mentor_display_name')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl xl:max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 text-navy">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
              AI Study Mentor
            </h1>
            <span className="text-xl" aria-hidden="true">
              🌱
            </span>
          </div>
          <p className="mt-1 font-sans text-xs font-semibold text-navy-muted sm:text-sm">
            Personalized guidance synthesized from your real assessment history — not generic advice.
          </p>
        </div>
        <PinButton
          id="mentor-session"
          title="AI Mentor Session"
          type="mentor"
          href="/mentor"
          badge="Mentor"
        />
      </div>
      <MentorPanel mentorDisplayName={profile?.mentor_display_name || 'AI Mentor'} />
    </div>
  );
}
