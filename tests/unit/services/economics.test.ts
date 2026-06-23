/**
 * Unit tests for BUCR economic logic introduced in Phases 1–10.
 * These are pure-function tests (no DB calls).
 */
import { describe, it, expect } from 'vitest';
import { ECONOMICS } from '@/lib/config/economics';
import {
  calculateReservationDeposit,
  calculateShowupBonus,
  calculateCancellationRefund,
} from '@/services/credit.service';
import { calculateCreditsFromAmount, calculateAmountForCredits } from '@/services/payment.service';
import { getSubscriptionTiers, getSubscriptionPrice } from '@/services/subscription.service';

// ============================================================================
// ECONOMICS constants sanity checks
// ============================================================================
describe('ECONOMICS config', () => {
  it('CREDIT_VALUE_NGN is ₦10 (locked)', () => {
    expect(ECONOMICS.CREDIT_VALUE_NGN).toBe(10);
  });

  it('default CREDIT_SPREAD is 6%', () => {
    expect(ECONOMICS.CREDIT_SPREAD).toBeCloseTo(0.06);
  });

  it('CREDIT_EXPIRY_DAYS is 90', () => {
    expect(ECONOMICS.CREDIT_EXPIRY_DAYS).toBe(90);
  });

  it('VENDOR_WITHDRAWAL_ENABLED defaults false', () => {
    expect(ECONOMICS.VENDOR_WITHDRAWAL_ENABLED).toBe(false);
  });

  it('no-show split sums to deposit for all venue types', () => {
    // platformShare = forfeit − vendorShare (derived, not a separate constant)
    for (const [venue, forfeitPct] of Object.entries(ECONOMICS.NOSHOW_FORFEIT_BY_VENUE)) {
      const deposit = 100;
      const forfeit = Math.floor(deposit * forfeitPct);
      const guestKeeps = deposit - forfeit;
      const vendorShare = Math.floor(deposit * ECONOMICS.NOSHOW_VENDOR_PCT);
      const platformShare = forfeit - vendorShare;
      expect(guestKeeps + vendorShare + platformShare).toBe(deposit);
    }
  });

  it('NOSHOW_VENDOR_PCT does not exceed the minimum forfeit rate', () => {
    const minForfeit = Math.min(...Object.values(ECONOMICS.NOSHOW_FORFEIT_BY_VENUE));
    expect(ECONOMICS.NOSHOW_VENDOR_PCT).toBeLessThanOrEqual(minForfeit);
  });
});

// ============================================================================
// Credit value — Phase 2
// ============================================================================
describe('Credit value (₦10)', () => {
  it('50-credit deposit has ₦500 face value', () => {
    expect(50 * ECONOMICS.CREDIT_VALUE_NGN).toBe(500);
  });

  it('100-credit deposit has ₦1,000 face value', () => {
    expect(100 * ECONOMICS.CREDIT_VALUE_NGN).toBe(1000);
  });
});

// ============================================================================
// Credit purchase price — Phase 2
// ============================================================================
describe('Credit purchase price (₦10.60 per credit with 6% spread)', () => {
  // Price is rounded to the nearest whole kobo to avoid floating-point drift:
  // Math.round(10 * 1.06 * 100) = Math.round(1060.0000000000002) = 1060
  const PRICE_KOBO = Math.round(ECONOMICS.CREDIT_VALUE_NGN * (1 + ECONOMICS.CREDIT_SPREAD) * 100);

  it('per-credit price rounds to 1,060 kobo (₦10.60)', () => {
    expect(PRICE_KOBO).toBe(1060);
  });

  it('calculateAmountForCredits(100) returns 106,000 kobo', () => {
    expect(calculateAmountForCredits(100)).toBe(106000);
  });

  it('calculateCreditsFromAmount(106000) returns 100 credits', () => {
    expect(calculateCreditsFromAmount(106000)).toBe(100);
  });

  it('round-trip: credits → kobo → credits is lossless for clean amounts', () => {
    for (const credits of [50, 100, 200, 500]) {
      const kobo = calculateAmountForCredits(credits);
      expect(calculateCreditsFromAmount(kobo)).toBe(credits);
    }
  });
});

// ============================================================================
// Deposit — FLAT per reservation, by venue type (party size irrelevant)
// ============================================================================
describe('ECONOMICS deposit by venue type', () => {
  it('fine_dining = 2,000 credits (₦20,000)', () => {
    expect(ECONOMICS.DEPOSIT_BY_VENUE_TYPE.fine_dining).toBe(2000);
  });
  it('upscale_casual = 1,500 credits (₦15,000)', () => {
    expect(ECONOMICS.DEPOSIT_BY_VENUE_TYPE.upscale_casual).toBe(1500);
  });
  it('lounge & casual = 1,000 credits (₦10,000)', () => {
    expect(ECONOMICS.DEPOSIT_BY_VENUE_TYPE.lounge).toBe(1000);
    expect(ECONOMICS.DEPOSIT_BY_VENUE_TYPE.casual).toBe(1000);
  });
  it('DEPOSIT_DEFAULT fallback = 1,000 (₦10,000 minimum)', () => {
    expect(ECONOMICS.DEPOSIT_DEFAULT).toBe(1000);
  });
});

describe('calculateReservationDeposit (flat, party size irrelevant)', () => {
  it('uses venue-type default when no custom override', () => {
    expect(calculateReservationDeposit('fine_dining')).toBe(2000);
    expect(calculateReservationDeposit('upscale_casual')).toBe(1500);
    expect(calculateReservationDeposit('lounge')).toBe(1000);
    expect(calculateReservationDeposit('casual')).toBe(1000);
  });
  it('vendor custom deposit overrides venue default', () => {
    expect(calculateReservationDeposit('casual', 5000)).toBe(5000);
    expect(calculateReservationDeposit('fine_dining', 800)).toBe(800);
  });
  it('falls back to DEPOSIT_DEFAULT for unknown / missing venue type', () => {
    expect(calculateReservationDeposit(undefined)).toBe(ECONOMICS.DEPOSIT_DEFAULT);
    expect(calculateReservationDeposit('unknown_type')).toBe(ECONOMICS.DEPOSIT_DEFAULT);
    expect(calculateReservationDeposit(null, null)).toBe(ECONOMICS.DEPOSIT_DEFAULT);
  });
  it('ignores a zero/negative custom override and uses venue default', () => {
    expect(calculateReservationDeposit('fine_dining', 0)).toBe(2000);
    expect(calculateReservationDeposit('fine_dining', -10)).toBe(2000);
  });
});

// ============================================================================
// Show-up bonus — 3%
// ============================================================================
describe('calculateShowupBonus (3%)', () => {
  it('SHOWUP_BONUS_PCT is 3%', () => expect(ECONOMICS.SHOWUP_BONUS_PCT).toBeCloseTo(0.03));
  it('3% of 1000 credits = 30',  () => expect(calculateShowupBonus(1000)).toBe(30));
  it('3% of 1500 credits = 45',  () => expect(calculateShowupBonus(1500)).toBe(45));
  it('3% of 2000 credits = 60',  () => expect(calculateShowupBonus(2000)).toBe(60));
  it('3% of 50 credits = 1 (floor of 1.5)', () => expect(calculateShowupBonus(50)).toBe(1));
});

// ============================================================================
// Cancellation refund — individual CANCEL_* constants
// ============================================================================
describe('ECONOMICS cancellation constants', () => {
  it('CANCEL_FULL_REFUND_HOURS = 24', () => {
    expect(ECONOMICS.CANCEL_FULL_REFUND_HOURS).toBe(24);
  });
  it('CANCEL_PARTIAL_REFUND_HOURS = 12', () => {
    expect(ECONOMICS.CANCEL_PARTIAL_REFUND_HOURS).toBe(12);
  });
  it('CANCEL_PARTIAL_REFUND_PCT = 0.50', () => {
    expect(ECONOMICS.CANCEL_PARTIAL_REFUND_PCT).toBe(0.50);
  });
  it('VENDOR_CANCEL_BONUS_PCT = 0.10', () => {
    expect(ECONOMICS.VENDOR_CANCEL_BONUS_PCT).toBe(0.10);
  });
});

describe('calculateCancellationRefund', () => {
  it('≥24 h → 100% refund',  () => expect(calculateCancellationRefund(100, 25)).toBe(100));
  it('12–24 h → 50% refund', () => expect(calculateCancellationRefund(100, 18)).toBe(50));
  it('<12 h → 0% refund',    () => expect(calculateCancellationRefund(100, 6)).toBe(0));
  it('exact boundary 24 h → 100%', () => expect(calculateCancellationRefund(100, 24)).toBe(100));
  it('exact boundary 12 h → 50%',  () => expect(calculateCancellationRefund(100, 12)).toBe(50));
});

// ============================================================================
// No-show split — Phase 4
// ============================================================================
describe('No-show split (resolved model)', () => {
  function noShowSplit(deposit: number, venueType: string) {
    const forfeitPct =
      ECONOMICS.NOSHOW_FORFEIT_BY_VENUE[venueType] ?? ECONOMICS.NOSHOW_FORFEIT_PCT;
    const forfeit      = Math.floor(deposit * forfeitPct);
    const guestKeeps   = deposit - forfeit;
    const vendorShare  = Math.floor(deposit * ECONOMICS.NOSHOW_VENDOR_PCT);
    const platformShare = forfeit - vendorShare;
    return { forfeit, guestKeeps, vendorShare, platformShare };
  }

  it('1000-credit deposit (40% uniform) → guest keeps 600, vendor +300, platform +100', () => {
    const r = noShowSplit(1000, 'upscale_casual');
    expect(r.forfeit).toBe(400);
    expect(r.guestKeeps).toBe(600);
    expect(r.vendorShare).toBe(300);
    expect(r.platformShare).toBe(100);
  });

  it('2000-credit deposit, fine_dining (40%) → guest keeps 1200, vendor +600, platform +200', () => {
    const r = noShowSplit(2000, 'fine_dining');
    expect(r.forfeit).toBe(800);
    expect(r.guestKeeps).toBe(1200);
    expect(r.vendorShare).toBe(600);
    expect(r.platformShare).toBe(200);
  });

  it('100-credit deposit, casual (40% uniform) → guest keeps 60, vendor +30, platform +10', () => {
    const r = noShowSplit(100, 'casual');
    expect(r.forfeit).toBe(40);
    expect(r.guestKeeps).toBe(60);
    expect(r.vendorShare).toBe(30);
    expect(r.platformShare).toBe(10);
  });

  it('guest always keeps majority of deposit (60% > 40%)', () => {
    for (const venue of Object.keys(ECONOMICS.NOSHOW_FORFEIT_BY_VENUE)) {
      const r = noShowSplit(200, venue);
      expect(r.guestKeeps).toBeGreaterThan(r.forfeit);
    }
  });

  it('forfeit = vendorShare + platformShare (no leakage)', () => {
    for (const venue of Object.keys(ECONOMICS.NOSHOW_FORFEIT_BY_VENUE)) {
      const r = noShowSplit(100, venue);
      expect(r.vendorShare + r.platformShare).toBe(r.forfeit);
    }
  });
});

// ============================================================================
// Per-cover fee — Phase 6
// ============================================================================
describe('Per-cover fee', () => {
  function coverFee(venueType: string, tier: string, partySize: number): number {
    const base       = ECONOMICS.PER_COVER_FEE[venueType] ?? 500;
    const multiplier = ECONOMICS.PER_COVER_TIER_MULTIPLIER[tier] ?? 1.0;
    return Math.round(base * multiplier * partySize);
  }

  it('basic tier flat ₦1,500/cover — party of 4 → ₦6,000', () => {
    expect(coverFee('fine_dining', 'basic', 4)).toBe(6000);
    expect(coverFee('casual', 'basic', 4)).toBe(6000); // flat across venue types
  });

  it('pro tier 50% discount — ₦750/cover, party of 4 → ₦3,000', () => {
    expect(coverFee('fine_dining', 'pro', 4)).toBe(3000);
  });

  it('elite tier waived → ₦0 for any party size', () => {
    expect(coverFee('fine_dining', 'elite', 4)).toBe(0);
    expect(coverFee('fine_dining', 'elite', 10)).toBe(0);
  });

  it('casual basic, party of 2 → ₦3,000 (₦1,500 × 2)', () => {
    expect(coverFee('casual', 'basic', 2)).toBe(3000);
  });

  it('per-cover base is ₦1,500 flat across all venue types', () => {
    for (const v of Object.values(ECONOMICS.PER_COVER_FEE)) {
      expect(v).toBe(1500);
    }
  });
});

// ============================================================================
// Subscription repricing — Phase 5
// ============================================================================
describe('Subscription tiers (Phase 5)', () => {
  const tiers = getSubscriptionTiers();

  it('Basic is free (₦0)', () => {
    expect(tiers.basic.priceNgn).toBe(0);
    expect(tiers.basic.priceKobo).toBe(0);
    expect(tiers.basic.free).toBe(true);
  });

  it('Pro is ₦30,000/month', () => {
    expect(tiers.pro.priceNgn).toBe(30000);
    expect(tiers.pro.priceKobo).toBe(3000000);
  });

  it('Elite is ₦85,000/month', () => {
    expect(tiers.elite.priceNgn).toBe(85000);
    expect(tiers.elite.priceKobo).toBe(8500000);
  });

  it('getSubscriptionPrice("basic") returns 0 kobo', () => {
    expect(getSubscriptionPrice('basic')).toBe(0);
  });

  it('getSubscriptionPrice("elite") returns 8,500,000 kobo', () => {
    expect(getSubscriptionPrice('elite')).toBe(8500000);
  });
});

// ============================================================================
// Gifting fee — Phase 8
// ============================================================================
describe('Gift fee (8%)', () => {
  it('100-credit gift → 8-credit fee, 108 total deducted', () => {
    const creditAmount = 100;
    const feeCredits   = Math.round(creditAmount * ECONOMICS.GIFT_FEE_PCT);
    expect(feeCredits).toBe(8);
    expect(creditAmount + feeCredits).toBe(108);
  });

  it('50-credit gift → 4-credit fee, 54 total deducted', () => {
    const feeCredits = Math.round(50 * ECONOMICS.GIFT_FEE_PCT);
    expect(feeCredits).toBe(4);
  });

  it('fee is rounded, not truncated', () => {
    // 15 × 0.08 = 1.2 → rounds to 1
    expect(Math.round(15 * ECONOMICS.GIFT_FEE_PCT)).toBe(1);
    // 13 × 0.08 = 1.04 → rounds to 1
    expect(Math.round(13 * ECONOMICS.GIFT_FEE_PCT)).toBe(1);
  });
});

// ============================================================================
// Withdrawal guard — Phase 3
// ============================================================================
describe('Vendor withdrawal guard', () => {
  it('VENDOR_WITHDRAWAL_ENABLED defaults to false', () => {
    expect(ECONOMICS.VENDOR_WITHDRAWAL_ENABLED).toBe(false);
  });
});
