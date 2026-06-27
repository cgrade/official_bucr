/**
 * Timezone-safe reservation date/time handling.
 *
 * Reservations are stored as a calendar `date` (UTC midnight) plus a wall-clock `time`
 * string ("HH:MM") in the venue's local time. The previous code combined them with
 * `new Date(date).setHours(hh, mm)`, which uses the SERVER's timezone — so the same
 * booking resolved to a different absolute instant on UTC infrastructure (Vercel) than on
 * a Lagos dev machine, shifting cancellation-refund tiers, reminders and the "is it in the
 * future" check by the timezone offset.
 *
 * We interpret wall-clock times in a fixed business-timezone offset. Nigeria (Africa/Lagos)
 * is a constant UTC+1 with no DST, so a fixed offset is exact year-round. Override via
 * BUSINESS_UTC_OFFSET_MINUTES if/when launching a market on a different offset.
 */

const BUSINESS_UTC_OFFSET_MINUTES = Number(process.env.BUSINESS_UTC_OFFSET_MINUTES ?? 60);

function offsetSuffix(mins: number): string {
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** YYYY-MM-DD from a Date (its UTC calendar day) or an ISO/date string. */
function datePart(date: Date | string): string {
  return typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
}

/**
 * Combine a reservation date with a wall-clock "HH:MM" into an absolute instant, evaluated
 * in the business timezone — independent of the server's timezone.
 */
export function combineDateAndTime(date: Date | string, time: string): Date {
  const [hh = '0', mm = '0'] = (time || '00:00').split(':');
  return new Date(
    `${datePart(date)}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00${offsetSuffix(BUSINESS_UTC_OFFSET_MINUTES)}`,
  );
}

interface OperatingHour {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  openTime: string;  // "HH:MM"
  closeTime: string; // "HH:MM"
  isClosed?: boolean;
}

const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Is the venue open for a booking on this calendar date + wall-clock time, given its
 * weekly operating hours? Returns true when hours aren't configured (don't block vendors
 * who haven't set them). Handles a window that spans midnight (close <= open).
 */
export function isVenueOpen(operatingHours: unknown, date: Date | string, time: string): boolean {
  if (!Array.isArray(operatingHours) || operatingHours.length === 0) return true;
  const hours = operatingHours as OperatingHour[];
  // Day of week of the reservation's calendar date (stored at UTC midnight).
  const dow = new Date(`${datePart(date)}T00:00:00Z`).getUTCDay();
  const today = hours.find((h) => h.dayOfWeek === dow);
  if (!today || today.isClosed) return false;

  const t = toMinutes(time);
  const open = toMinutes(today.openTime);
  const close = toMinutes(today.closeTime);
  // Normal same-day window vs one that crosses midnight (e.g. 18:00 → 02:00).
  return close > open ? t >= open && t <= close : t >= open || t <= close;
}
