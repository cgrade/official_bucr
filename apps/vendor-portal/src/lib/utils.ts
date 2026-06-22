import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Display currency ──────────────────────────────────────────────────────────
// All stored money is NGN (the credit base is ₦10). For Ghana/Kenya vendors we
// DISPLAY the local-currency equivalent using a live FX rate (set once at login
// by the dashboard's CurrencyGate). This is presentation only — nothing settles
// in these currencies.
let displayCurrency = { code: 'NGN', symbol: '₦', perNGN: 1 };

export function setDisplayCurrency(c: { code: string; symbol: string; perNGN: number }) {
  displayCurrency = c;
}
export function getDisplayCurrency() {
  return displayCurrency;
}

/** Formats an NGN amount into the active display currency (converted via FX). */
export function formatCurrency(amount: number): string {
  const { symbol, perNGN } = displayCurrency;
  const local = (amount || 0) * perNGN;
  return `${symbol}${local.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
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

/** 1 credit = ₦10 (canonical: CLAUDE.md §4.1 — locked, never ₦100) */
export const CREDIT_VALUE_NGN = 10;

export function creditsToNaira(credits: number): number {
  return credits * CREDIT_VALUE_NGN;
}
