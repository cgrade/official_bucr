import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toValidDate(date: unknown): Date | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(date?: string | Date | null): string {
  const d = toValidDate(date);
  if (!d) return '-';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date?: string | Date | null): string {
  const d = toValidDate(date);
  if (!d) return '-';
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelative(date?: string | Date | null): string {
  const d = toValidDate(date);
  if (!d) return '-';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    inactive: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  };
  return colors[status.toLowerCase()] || colors.inactive;
}
