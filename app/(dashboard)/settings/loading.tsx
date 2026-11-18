import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 mb-8 h-4 w-80" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded" />
        ))}
      </div>
    </div>
  );
}
