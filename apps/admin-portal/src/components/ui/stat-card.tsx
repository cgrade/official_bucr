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
    icon: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    iconGlow: '',
  },
  primary: {
    icon: 'bg-gradient-to-br from-tertiary-500 to-tertiary-600 text-white shadow-lg shadow-tertiary-500/30',
    iconGlow: 'shadow-glow-primary',
  },
  success: {
    icon: 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30',
    iconGlow: 'shadow-glow-success',
  },
  warning: {
    icon: 'bg-gradient-to-br from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-500/30',
    iconGlow: '',
  },
  secondary: {
    icon: 'bg-gradient-to-br from-secondary-400 to-secondary-600 text-white shadow-lg shadow-secondary-500/30',
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
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
              <span className="text-xs text-slate-500 dark:text-slate-400">
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
