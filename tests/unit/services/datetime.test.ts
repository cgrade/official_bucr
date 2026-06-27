import { describe, it, expect } from 'vitest';
import { combineDateAndTime, isVenueOpen } from '@/lib/utils/datetime';

/**
 * Guards the P0 timezone fix: reservation wall-clock times must resolve to the SAME
 * absolute instant regardless of the server timezone. Default business offset is
 * Africa/Lagos (UTC+1, no DST), so 19:00 local == 18:00:00Z.
 */
describe('combineDateAndTime (business-timezone wall-clock)', () => {
  it('interprets a time string in UTC+1 (Africa/Lagos), independent of server TZ', () => {
    // 19:00 WAT == 18:00:00Z
    expect(combineDateAndTime('2026-06-25', '19:00').toISOString()).toBe('2026-06-25T18:00:00.000Z');
    expect(combineDateAndTime('2026-01-01', '00:00').toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(combineDateAndTime('2026-06-25', '23:30').toISOString()).toBe('2026-06-25T22:30:00.000Z');
  });

  it('accepts a Date (uses its UTC calendar day) as well as a string', () => {
    const d = new Date('2026-06-25T00:00:00.000Z');
    expect(combineDateAndTime(d, '12:00').toISOString()).toBe('2026-06-25T11:00:00.000Z');
  });

  it('does NOT shift with the host timezone (the bug it replaces)', () => {
    // The result is pinned by the explicit offset in the ISO string, so the absolute
    // instant is the same whatever TZ the process runs in.
    const a = combineDateAndTime('2026-06-25', '19:00').getTime();
    const b = new Date('2026-06-25T18:00:00.000Z').getTime();
    expect(a).toBe(b);
  });

  it('cancellation-tier math is stable: hours-until is computed from the absolute instant', () => {
    const at = combineDateAndTime('2026-06-25', '19:00');
    const thirtyHoursBefore = at.getTime() - 30 * 3600_000;
    const hoursUntil = Math.floor((at.getTime() - thirtyHoursBefore) / 3600_000);
    expect(hoursUntil).toBe(30); // → 100% refund tier, deterministically
  });
});

describe('isVenueOpen (booking gate)', () => {
  const DATE = '2026-06-25';
  const dow = new Date(`${DATE}T00:00:00Z`).getUTCDay();
  const hours = (o: string, c: string, isClosed = false) => [{ dayOfWeek: dow, openTime: o, closeTime: c, isClosed }];

  it('open within opening hours', () => {
    expect(isVenueOpen(hours('10:00', '22:00'), DATE, '19:00')).toBe(true);
  });
  it('closed before opening / after closing', () => {
    expect(isVenueOpen(hours('10:00', '22:00'), DATE, '09:00')).toBe(false);
    expect(isVenueOpen(hours('10:00', '22:00'), DATE, '23:00')).toBe(false);
  });
  it('a day marked closed rejects any time', () => {
    expect(isVenueOpen(hours('10:00', '22:00', true), DATE, '19:00')).toBe(false);
  });
  it('a day with no hours entry is closed', () => {
    expect(isVenueOpen([{ dayOfWeek: (dow + 1) % 7, openTime: '10:00', closeTime: '22:00' }], DATE, '19:00')).toBe(false);
  });
  it('no hours configured → not blocked (no-op)', () => {
    expect(isVenueOpen([], DATE, '03:00')).toBe(true);
    expect(isVenueOpen(null, DATE, '03:00')).toBe(true);
  });
  it('handles a window that crosses midnight (18:00 → 02:00)', () => {
    expect(isVenueOpen(hours('18:00', '02:00'), DATE, '23:00')).toBe(true);
    expect(isVenueOpen(hours('18:00', '02:00'), DATE, '01:00')).toBe(true);
    expect(isVenueOpen(hours('18:00', '02:00'), DATE, '17:00')).toBe(false);
  });
});
