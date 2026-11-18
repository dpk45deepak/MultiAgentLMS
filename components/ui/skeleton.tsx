import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[#D7EAFB]/50 border border-[#D7EAFB]/60', className)}
      {...props}
    />
  );
}

export { Skeleton };
