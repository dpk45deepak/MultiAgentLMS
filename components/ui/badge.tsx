import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-heading text-xs font-bold border-2 transition-transform duration-150',
  {
    variants: {
      variant: {
        default: 'bg-[#F0F5FA] border-[#D7EAFB] text-navy',
        marker: 'bg-[#D7EAFB] border-[#B9D9F5] text-navy shadow-xs',
        highlight: 'bg-[#FFE9A8] border-[#F2D785] text-navy shadow-xs',
        flag: 'bg-[#F8C9D4] border-[#EEA8B8] text-navy shadow-xs',
        mint: 'bg-[#D6EAD6] border-[#B5DEB5] text-navy shadow-xs',
        lavender: 'bg-[#E6DDF8] border-[#CDBCF0] text-navy shadow-xs',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
