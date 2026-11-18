import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'rounded-xl border-2 px-4 py-3 font-sans text-sm font-medium shadow-xs transition-all',
  {
    variants: {
      variant: {
        default: 'border-[#D7EAFB] bg-[#F4F9FE] text-navy',
        destructive: 'border-[#F8C9D4] bg-[#FDEAEF] text-navy',
        success: 'border-[#D6EAD6] bg-[#EDF7ED] text-navy',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
