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
