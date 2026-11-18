import { AlertTriangle } from 'lucide-react';

/** Shown when a server page could not load its data — never confuse this with an empty state. */
export function ErrorState({
  title = 'We couldn\u2019t load this page',
  message = 'Something went wrong while loading your data. Your progress is safe — please refresh in a moment.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      role="alert"
      className="mx-auto my-10 flex max-w-xl flex-col items-center gap-2 rounded-2xl border-2 border-[#F8C9D4] bg-[#FDEAEF] px-6 py-8 text-center text-navy shadow-xs"
    >
      <AlertTriangle size={28} className="text-[#E11D48]" aria-hidden="true" />
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      <p className="font-sans text-sm font-medium text-navy-muted">{message}</p>
    </div>
  );
}
