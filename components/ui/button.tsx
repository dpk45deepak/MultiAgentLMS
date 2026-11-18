import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-heading text-sm font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A9BD5] focus-visible:ring-offset-2 select-none active:translate-y-[2px]',
  {
    variants: {
      variant: {
        default:
          'bg-[#B9D9F5] text-navy border-2 border-[#8EBBE3] shadow-[0_3px_0_0_#8EBBE3] hover:bg-[#A8D0F5] active:shadow-[0_1px_0_0_#8EBBE3]',
        marker:
          'bg-[#F8C9D4] text-navy border-2 border-[#ECA7B7] shadow-[0_3px_0_0_#ECA7B7] hover:bg-[#F6B7C6] active:shadow-[0_1px_0_0_#ECA7B7]',
        outline:
          'bg-white text-navy border-2 border-[#D7EAFB] shadow-[0_3px_0_0_#D7EAFB] hover:bg-[#F3F9FE] hover:border-[#B9D9F5] active:shadow-[0_1px_0_0_#D7EAFB]',
        ghost:
          'text-navy hover:bg-[#D7EAFB]/70 hover:text-navy active:translate-y-0',
        link:
          'text-[#2A66A3] underline-offset-4 hover:underline p-0 h-auto font-bold active:translate-y-0',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-11 px-6 text-base rounded-2xl',
        icon: 'h-9 w-9 rounded-xl',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
