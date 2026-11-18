import Link from 'next/link';
import { Minus, Square, X } from 'lucide-react';
import { SmilingCloud, Sparkle } from '@/components/ui/kawaii-decorations';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: { text: string; linkText: string; href: string };
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center desktop-wallpaper px-4 py-12 text-navy">
      {/* Decorative floating clouds & sparkles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-12 left-10 opacity-70 animate-float">
          <SmilingCloud size={80} />
        </div>
        <div className="absolute bottom-12 right-12 opacity-70 animate-float" style={{ animationDelay: '2s' }}>
          <SmilingCloud size={90} />
        </div>
        <div className="absolute top-20 right-1/4 opacity-80 animate-sparkle">
          <Sparkle size={24} color="#FFE9A8" />
        </div>
        <div className="absolute bottom-24 left-1/3 opacity-80 animate-sparkle" style={{ animationDelay: '1s' }}>
          <Sparkle size={20} color="#F8C9D4" />
        </div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Retro Window Container */}
        <div className="rounded-2xl border-2 border-[#B9D9F5] bg-white shadow-window overflow-hidden">
          {/* Titlebar */}
          <div className="flex select-none items-center justify-between border-b-2 border-[#A8CEF0] bg-gradient-to-r from-[#CDE3F8] via-[#B9D9F5] to-[#CDE3F8] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                💌
              </span>
              <span className="font-heading text-xs font-bold text-navy sm:text-sm">
                AI Tutor OS &middot; Account Login
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#96C2E9] bg-white/90 text-navy shadow-xs">
                <Minus size={10} strokeWidth={2.5} />
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#96C2E9] bg-white/90 text-navy shadow-xs">
                <Square size={9} strokeWidth={2.5} />
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#96C2E9] bg-white/90 text-navy shadow-xs">
                <X size={10} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Window Body */}
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D7EAFB] border-2 border-[#B9D9F5] shadow-xs">
                <span className="text-2xl">🌸</span>
              </div>
              <h1 className="font-heading text-2xl font-bold text-navy">{title}</h1>
              <p className="mt-1 font-sans text-sm font-semibold text-navy-muted">{description}</p>
            </div>

            {children}

            <div className="mt-6 border-t-2 border-[#D7EAFB] pt-4 text-center">
              <p className="font-sans text-xs font-bold text-navy-muted">
                {footer.text}{' '}
                <Link
                  href={footer.href}
                  className="font-heading text-xs font-bold text-[#2A66A3] hover:underline"
                >
                  {footer.linkText}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="font-heading text-xs font-bold text-navy-muted hover:text-navy hover:underline"
          >
            &larr; Back to Desktop Home
          </Link>
        </div>
      </div>
    </main>
  );
}
