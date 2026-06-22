import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ECONOMICS } from '@/lib/config/economics';

// ── helpers ────────────────────────────────────────────────────────────────
function makeReservations(specs: Array<{ status: string; cancelledBy?: string | null }>) {
  return specs.map((s, i) => ({ id: `r-${i}`, status: s.status, cancelledBy: s.cancelledBy ?? null }));
}

// ── db mock ────────────────────────────────────────────────────────────────
const mockVendors = [
  {
    id: 'v1',
    reliabilityScore: null as number | null,
    bookWithConfidence: false,
    badgeQualifyingSince: null as Date | null,
  },
];

vi.mock('@/lib/db', () => ({
  db: {
    vendor: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    reservation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { db } from '@/lib/db';
import { computeReliabilityScores } from '@/services/reliability.service';

describe('Reliability Service — score computation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips vendors with zero confirmed bookings (no division by zero)', async () => {
    (db.vendor.findMany as any).mockResolvedValue([{ ...mockVendors[0] }]);
    (db.reservation.findMany as any).mockResolvedValue([]); // no bookings

    const result = await computeReliabilityScores();
    // Should not call db.vendor.update for a vendor with no data
    expect(db.vendor.update).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  it('calculates 100% score when all bookings are fulfilled', async () => {
    (db.vendor.findMany as any).mockResolvedValue([{ ...mockVendors[0] }]);
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([
        { status: 'checked_in' },
        { status: 'checked_in' },
        { status: 'completed' },
      ])
    );

    await computeReliabilityScores();

    const updateCall = (db.vendor.update as any).mock.calls[0][0];
    expect(updateCall.data.reliabilityScore).toBe(1.0);
    expect(updateCall.data.bookWithConfidence).toBe(false); // not yet 60 days
  });

  it('counts vendor-cancelled reservations against the score', async () => {
    (db.vendor.findMany as any).mockResolvedValue([{ ...mockVendors[0] }]);
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([
        { status: 'checked_in' },
        { status: 'checked_in' },
        { status: 'cancelled', cancelledBy: 'vendor' }, // counts against vendor
        { status: 'no_show' },                          // guest fault — excluded
      ])
    );

    await computeReliabilityScores();

    const updateCall = (db.vendor.update as any).mock.calls[0][0];
    // confirmed = checked_in×2 + vendor-cancel×1 = 3 total counted
    // fulfilled = checked_in×2 = 2
    // score = 2/3 ≈ 0.667
    expect(updateCall.data.reliabilityScore).toBeCloseTo(0.667, 2);
  });

  it('excludes guest no-shows from the score denominator', async () => {
    (db.vendor.findMany as any).mockResolvedValue([{ ...mockVendors[0] }]);
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([
        { status: 'checked_in' },
        { status: 'no_show' }, // guest fault — excluded entirely
        { status: 'no_show' }, // guest fault — excluded
      ])
    );

    await computeReliabilityScores();

    const updateCall = (db.vendor.update as any).mock.calls[0][0];
    // Only checked_in counts. confirmed = 1, fulfilled = 1 → score = 1.0
    expect(updateCall.data.reliabilityScore).toBe(1.0);
  });

  it('excludes user-cancelled reservations from denominator', async () => {
    (db.vendor.findMany as any).mockResolvedValue([{ ...mockVendors[0] }]);
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([
        { status: 'checked_in' },
        { status: 'cancelled', cancelledBy: 'user' }, // user cancel — excluded
      ])
    );

    await computeReliabilityScores();

    const updateCall = (db.vendor.update as any).mock.calls[0][0];
    // confirmed = 1 (only checked_in), fulfilled = 1 → score = 1.0
    expect(updateCall.data.reliabilityScore).toBe(1.0);
  });

  it('awards badge after BADGE_SUSTAINED_DAYS at ≥ BADGE_THRESHOLD', async () => {
    const qualifyingDate = new Date();
    qualifyingDate.setDate(qualifyingDate.getDate() - (ECONOMICS.BADGE_SUSTAINED_DAYS + 1));

    (db.vendor.findMany as any).mockResolvedValue([{
      ...mockVendors[0],
      reliabilityScore: 0.98,
      badgeQualifyingSince: qualifyingDate,
      bookWithConfidence: false,
    }]);
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([{ status: 'checked_in' }, { status: 'checked_in' }])
    );

    const result = await computeReliabilityScores();
    const updateCall = (db.vendor.update as any).mock.calls[0][0];

    expect(updateCall.data.bookWithConfidence).toBe(true);
    expect(result.badgesAwarded).toBe(1);
  });

  it('does NOT award badge before BADGE_SUSTAINED_DAYS', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10); // only 10 days, need 60

    (db.vendor.findMany as any).mockResolvedValue([{
      ...mockVendors[0],
      badgeQualifyingSince: recentDate,
      bookWithConfidence: false,
    }]);
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([{ status: 'checked_in' }, { status: 'checked_in' }])
    );

    await computeReliabilityScores();
    const updateCall = (db.vendor.update as any).mock.calls[0][0];
    expect(updateCall.data.bookWithConfidence).toBe(false);
  });

  it('revokes badge when score drops below BADGE_THRESHOLD', async () => {
    (db.vendor.findMany as any).mockResolvedValue([{
      ...mockVendors[0],
      bookWithConfidence: true,  // currently holds badge
      badgeQualifyingSince: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    }]);
    // Score of 2/3 ≈ 0.667 — below 0.95 threshold
    (db.reservation.findMany as any).mockResolvedValue(
      makeReservations([
        { status: 'checked_in' },
        { status: 'cancelled', cancelledBy: 'vendor' },
        { status: 'cancelled', cancelledBy: 'vendor' },
      ])
    );

    const result = await computeReliabilityScores();
    const updateCall = (db.vendor.update as any).mock.calls[0][0];

    expect(updateCall.data.bookWithConfidence).toBe(false);
    expect(updateCall.data.badgeQualifyingSince).toBeNull();
    expect(result.badgesRevoked).toBe(1);
  });
});

describe('Reliability Service — ECONOMICS constants', () => {
  it('RELIABILITY_WINDOW_DAYS is 90', () => {
    expect(ECONOMICS.RELIABILITY_WINDOW_DAYS).toBe(90);
  });
  it('BADGE_THRESHOLD is 0.95', () => {
    expect(ECONOMICS.BADGE_THRESHOLD).toBe(0.95);
  });
  it('BADGE_SUSTAINED_DAYS is 60', () => {
    expect(ECONOMICS.BADGE_SUSTAINED_DAYS).toBe(60);
  });
});
