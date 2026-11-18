import { Skeleton } from '@/components/ui/skeleton';

export default function ProgressLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 mb-6 h-4 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded" />
        ))}
      </div>
    </div>
  );
}
