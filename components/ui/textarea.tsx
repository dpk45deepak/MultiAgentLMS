import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[120px] w-full rounded-xl border-2 border-[#D7EAFB] bg-white px-3.5 py-2.5 font-sans text-sm font-medium text-navy placeholder:text-navy-faint shadow-xs transition-all focus-visible:outline-none focus-visible:border-[#8EBBE3] focus-visible:ring-2 focus-visible:ring-[#B9D9F5]/40 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
