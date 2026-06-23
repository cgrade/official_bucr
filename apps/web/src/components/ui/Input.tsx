import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full h-11 rounded-xl border bg-surface px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.35)] transition-all',
          error ? 'border-red-400' : 'border-line focus:border-[#c9a84c]',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';
