import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-8 h-24 rounded" />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="mb-1 h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="mb-1 h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
