import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-[rgba(201,168,76,0.2)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-[#f5f0e8] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#7a8fa6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-0 focus-visible:border-[#c9a84c] focus-visible:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
