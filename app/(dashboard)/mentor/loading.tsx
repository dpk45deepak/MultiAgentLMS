import { Skeleton } from '@/components/ui/skeleton';

export default function MentorLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl xl:max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 mb-8 h-4 w-80" />
      <Skeleton className="h-28 rounded" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded" />
        ))}
      </div>
    </div>
  );
}
