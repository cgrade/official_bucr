import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-[#0f2547] mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full h-11 rounded-xl border bg-white px-4 text-sm text-[#0f2547] placeholder:text-[#7a8fa6] focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.35)] transition-all',
          error ? 'border-red-400' : 'border-[rgba(15,37,71,0.18)] focus:border-[#c9a84c]',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';
