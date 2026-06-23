import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** Resolve an image path/URL to a full URL. */
export function getImageUrl(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return `${API_URL}${src}`;
}

/** 1 credit = ₦10 (locked base). */
export function formatNaira(naira: number): string {
  return `₦${Math.round(naira || 0).toLocaleString('en-US')}`;
}

export function creditsToNaira(credits: number): number {
  return (credits || 0) * 10;
}

// Flat reservation deposit (credits) by venue type — mirrors ECONOMICS.
// A vendor's customDepositCredits overrides the venue-type default.
const DEPOSIT_BY_VENUE: Record<string, number> = {
  fine_dining: 2000,
  upscale_casual: 1500,
  lounge: 1000,
  casual: 1000,
};
export function getReservationDeposit(venueType?: string | null, customDepositCredits?: number | null): number {
  if (customDepositCredits && customDepositCredits > 0) return customDepositCredits;
  return DEPOSIT_BY_VENUE[venueType || ''] ?? 1000;
}

export function formatDate(date: string | Date): string {
  try {
    return new Date(date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(date);
  }
}
