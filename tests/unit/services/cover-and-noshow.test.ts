import { describe, it, expect } from 'vitest';
import { ECONOMICS } from '@/lib/config/economics';

/**
 * Locks the two money formulas that changed recently and are easy to regress:
 *  - per-cover success fee = base × tier multiplier × PARTY SIZE (per head)
 *  - no-show split: guest keeps 60%, vendor 30% (marketing), BUCR 10% (platformShare derived)
 * These mirror the exact arithmetic the services run.
 */

function perCoverFee(venueType: string, tier: string, partySize: number): number {
  const base = (ECONOMICS.PER_COVER_FEE as Record<string, number>)[venueType] ?? ECONOMICS.PER_COVER_FEE['upscale_casual'];
  const mult = (ECONOMICS.PER_COVER_TIER_MULTIPLIER as Record<string, number>)[tier] ?? 1;
  return Math.round(base * mult * partySize);
}

function noShowSplit(deposit: number) {
  const forfeit = Math.floor(deposit * ECONOMICS.NOSHOW_FORFEIT_PCT);
  const guestKeeps = deposit - forfeit;
  const vendorShare = Math.min(Math.floor(deposit * ECONOMICS.NOSHOW_VENDOR_PCT), forfeit);
  const platformShare = forfeit - vendorShare; // always derived, never a fixed %
  return { forfeit, guestKeeps, vendorShare, platformShare };
}

describe('Per-cover success fee (per head × party size)', () => {
  it('Basic tier = ₦1,500 per head', () => {
    expect(perCoverFee('upscale_casual', 'basic', 1)).toBe(1500);
    expect(perCoverFee('upscale_casual', 'basic', 4)).toBe(6000);
  });
  it('Pro tier halves the fee (₦750/head)', () => {
    expect(perCoverFee('upscale_casual', 'pro', 1)).toBe(750);
    expect(perCoverFee('upscale_casual', 'pro', 4)).toBe(3000);
  });
  it('Elite tier waives the fee (₦0)', () => {
    expect(perCoverFee('upscale_casual', 'elite', 4)).toBe(0);
  });
  it('scales linearly with party size (per head, not flat)', () => {
    expect(perCoverFee('fine_dining', 'basic', 6)).toBe(perCoverFee('fine_dining', 'basic', 1) * 6);
  });
});

describe('No-show split (60% keep / 30% vendor / 10% platform)', () => {
  it('1,500-credit deposit → keep 900, vendor 450, platform 150', () => {
    expect(noShowSplit(1500)).toEqual({ forfeit: 600, guestKeeps: 900, vendorShare: 450, platformShare: 150 });
  });
  it('1,000-credit deposit (CLAUDE.md worked example) → keep 600, vendor 300, platform 100', () => {
    expect(noShowSplit(1000)).toEqual({ forfeit: 400, guestKeeps: 600, vendorShare: 300, platformShare: 100 });
  });
  it('the three outcomes always sum back to the deposit', () => {
    for (const deposit of [1000, 1500, 2000, 1234]) {
      const s = noShowSplit(deposit);
      expect(s.guestKeeps + s.vendorShare + s.platformShare).toBe(deposit);
    }
  });
  it('platformShare is forfeit − vendorShare and never negative', () => {
    for (const deposit of [10, 100, 1000, 2000]) {
      const s = noShowSplit(deposit);
      expect(s.platformShare).toBe(s.forfeit - s.vendorShare);
      expect(s.platformShare).toBeGreaterThanOrEqual(0);
    }
  });
});
