import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
    }).format(d);
  } catch {
    return '-';
  }
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    // Handle time-only strings like "19:00" or "19:00:00"
    if (typeof date === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(date)) {
      const [hours, minutes] = date.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-NG', {
      timeStyle: 'short',
    }).format(d);
  } catch {
    return '-';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return '-';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function creditsToNaira(credits: number): number {
  return credits * 100;
}
