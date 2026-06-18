import crypto from 'crypto';

export function generatePin(length: number = 4): string {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

export function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BKR-${timestamp}-${random}`;
}

export function generateOrderReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function calculateCreditsForPartySize(partySize: number): number {
  if (partySize <= 2) return 50;
  if (partySize <= 6) return 100;
  return 200;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + minutes * 60 * 1000);
  return result;
}

export function isWithinHours(targetDate: Date, hours: number): boolean {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= hours && diffHours >= 0;
}

export function getHoursUntil(targetDate: Date): number {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function generateReferralCode(): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `REF-${random}`;
}

export function generateSlug(text: string): string {
  const slug = slugify(text);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${slug}-${suffix}`;
}

export function generateReservationReference(): string {
  return generateBookingReference();
}

export function formatCurrency(amountKobo: number): string {
  const naira = amountKobo / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export function creditsToNaira(credits: number): number {
  return credits * 100; // 1 credit = ₦100
}

export function nairaToCredits(naira: number): number {
  return Math.floor(naira / 100);
}
