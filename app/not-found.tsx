import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center desktop-wallpaper px-4 py-12 text-navy">
      <div className="w-full max-w-md rounded-2xl border-2 border-[#B9D9F5] bg-white p-8 text-center shadow-window">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#B9D9F5] bg-[#D7EAFB] text-2xl" aria-hidden="true">
          🔍
        </div>
        <h1 className="font-heading text-xl font-bold text-navy">Page not found</h1>
        <p className="mt-2 font-sans text-sm font-medium text-navy-muted">
          That page doesn&rsquo;t exist, or it belongs to another account.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="marker" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
