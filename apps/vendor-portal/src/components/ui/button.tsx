/**
 * Button — 3-colour flat system: navy / gold / white
 * No gradients. No mixed intermediate shades.
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        // Primary: flat gold, navy text
        default:     'bg-[#c9a84c] text-[#0f2547] font-semibold hover:bg-[#f5f0e8] border border-[#c9a84c] hover:border-[#f5f0e8]',
        // Destructive: flat red
        destructive: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
        // Outlined: gold border, gold text → solid gold on hover
        outline:     'border border-[#c9a84c] bg-transparent text-[#c9a84c] hover:bg-[#c9a84c] hover:text-[#0f2547]',
        // Ghost: transparent, cream text
        ghost:       'bg-transparent text-[rgba(245,240,232,0.6)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f5f0e8]',
        // Secondary: slightly lighter navy
        secondary:   'bg-[rgba(255,255,255,0.06)] text-[#f5f0e8] border border-[rgba(201,168,76,0.2)] hover:bg-[rgba(255,255,255,0.1)]',
        link:        'bg-transparent text-[#c9a84c] underline-offset-4 hover:underline hover:text-[#f5f0e8]',
        success:     'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 px-3 text-[12px]',
        lg:      'h-11 px-8',
        xl:      'h-12 px-10 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
