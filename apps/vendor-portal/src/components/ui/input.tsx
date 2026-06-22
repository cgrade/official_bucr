import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-[rgba(201,168,76,0.2)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#f5f0e8] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#7a8fa6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-0 focus-visible:border-[#c9a84c] focus-visible:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-red-500 dark:border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
