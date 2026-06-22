'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'secondary';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-slate-100 bg-[rgba(255,255,255,0.04)] text-slate-600 text-[#7a8fa6]',
    iconGlow: '',
  },
  primary: {
    icon: 'bg-[#c9a84c] text-white shadow-lg shadow-tertiary-500/30',
    iconGlow: 'shadow-glow-primary',
  },
  success: {
    icon: 'bg-[rgba(255,255,255,0.06)]  text-white shadow-lg shadow-success-500/30',
    iconGlow: 'shadow-glow-success',
  },
  warning: {
    icon: 'bg-[rgba(255,255,255,0.06)]  text-white shadow-lg shadow-warning-500/30',
    iconGlow: '',
  },
  secondary: {
    icon: 'bg-[rgba(255,255,255,0.06)] text-white shadow-lg shadow-secondary-500/30',
    iconGlow: 'shadow-glow-secondary',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'stat-card glass-card rounded-2xl p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#7a8fa6]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-[#f5f0e8]">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-[#7a8fa6]">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-[#7a8fa6]">
                vs last period
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            styles.icon
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatCardGrid({ children, columns = 4, className }: StatCardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 lg:gap-6', gridCols[columns], className)}>
      {children}
    </div>
  );
}
