import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { RetroTaskbar } from '@/components/ui/retro-taskbar';
import { TimezoneSync } from '@/components/layout/TimezoneSync';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone')
    .eq('id', user.id)
    .single();

  return (
    <div className="relative min-h-screen overflow-x-hidden desktop-wallpaper lg:flex pb-12">
      <Sidebar displayName={profile?.display_name || user.email || 'Student'} />
      <main className="min-w-0 flex-1 lg:h-[calc(100vh-2.5rem)] lg:overflow-y-auto">{children}</main>
      <RetroTaskbar />
      <TimezoneSync storedTimezone={profile?.timezone ?? null} />
    </div>
  );
}
