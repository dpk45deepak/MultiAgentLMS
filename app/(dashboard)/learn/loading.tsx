import { Skeleton } from '@/components/ui/skeleton';

export default function LearnLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-96" />
      <Skeleton className="mt-8 h-40 rounded" />
      <div className="mt-12 flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded" />
        ))}
      </div>
    </div>
  );
}
