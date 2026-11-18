import { Skeleton } from '@/components/ui/skeleton';

export default function TutorLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl xl:max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 mb-6 h-4 w-72" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded" />
        ))}
      </div>
    </div>
  );
}
