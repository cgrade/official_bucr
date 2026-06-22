/**
 * ECONOMICS — single source of truth for every configurable business figure.
 *
 * Env-var overrides let operators tune any lever without a code edit.
 * Naming convention: the env-var key mirrors the constant name.
 *
 * Constraint: NOSHOW_VENDOR_PCT must be ≤ min(NOSHOW_FORFEIT_BY_VENUE values)
 * (currently casual = 0.25, vendor = 0.20 → satisfied).
 * platformShare is always derived as: forfeit − vendorShare.
 */
export const ECONOMICS = {

  // ── Credit unit & purchase pricing ────────────────────────────────────────
  /** Face value of one credit in NGN. LOCKED — changing this requires a data migration. */
  CREDIT_VALUE_NGN: 10,
  /** Markup over face value charged to buyers (default 6%). Revenue = spread × purchase. */
  CREDIT_SPREAD: numEnv('CREDIT_SPREAD', 0.06),
  /** Credits expire N months after purchase. */
  CREDIT_EXPIRY_MONTHS: numEnv('CREDIT_EXPIRY_MONTHS', 12),
  /** Days before expiry to send a reminder notification. */
  EXPIRY_REMINDER_DAYS: numEnv('EXPIRY_REMINDER_DAYS', 30),

  // ── Deposit — FLAT per reservation (NOT per person) ───────────────────────
  // The number of guests does NOT change the deposit. A reservation for 1 or
  // for 6 pays the same flat amount, determined by the venue type — or
  // overridden by the vendor via customDepositCredits on the Vendor model.
  // 1 credit = ₦10, so 1000 credits = ₦10,000.
  DEPOSIT_BY_VENUE_TYPE: {
    fine_dining:    numEnv('DEPOSIT_FINE_DINING',    2000), // ₦20,000
    upscale_casual: numEnv('DEPOSIT_UPSCALE_CASUAL', 1500), // ₦15,000
    lounge:         numEnv('DEPOSIT_LOUNGE',         1000), // ₦10,000
    casual:         numEnv('DEPOSIT_CASUAL',         1000), // ₦10,000
  } as Record<string, number>,

  /** Fallback flat deposit when a venue type is not listed above. */
  DEPOSIT_DEFAULT: numEnv('DEPOSIT_DEFAULT', 1000), // ₦10,000

  // ── Experiences (premium ticketed offerings, vendor-priced) ───────────────
  /** Minimum credits a vendor may charge for an Experience (3,000 = ₦30,000). */
  EXPERIENCE_MIN_CREDITS: numEnv('EXPERIENCE_MIN_CREDITS', 3000),
  /** Upper guard so a typo can't create a ₦10m experience (50,000 = ₦500,000). */
  EXPERIENCE_MAX_CREDITS: numEnv('EXPERIENCE_MAX_CREDITS', 50000),

  // ── Show-up bonus ─────────────────────────────────────────────────────────
  /** Fraction of deposit returned as bonus on check-in (3%). */
  SHOWUP_BONUS_PCT: numEnv('SHOWUP_BONUS_PCT', 0.03),

  // ── No-show split (resolved model) ────────────────────────────────────────
  // No-show forfeits 40% of the deposit, uniform across all venue types:
  //   guest keeps 60% · vendor gets 30% (marketing credits) · BUCR gets 10%.
  // platformShare is always derived as: forfeit − vendorShare = 40% − 30% = 10%.
  /** Fraction of deposit forfeited on a no-show (40%). */
  NOSHOW_FORFEIT_PCT: numEnv('NOSHOW_FORFEIT_PCT', 0.40),

  /**
   * Fraction of the ORIGINAL deposit credited to the vendor wallet as
   * non-cashable marketing credits (30%).
   * Must be ≤ NOSHOW_FORFEIT_PCT to keep platformShare ≥ 0.
   */
  NOSHOW_VENDOR_PCT: numEnv('NOSHOW_VENDOR_PCT', 0.30),

  /** Per-venue forfeit overrides — all uniform at 40% now. */
  NOSHOW_FORFEIT_BY_VENUE: {
    fine_dining:    numEnv('NOSHOW_FINE_DINING_PCT',    0.40),
    upscale_casual: numEnv('NOSHOW_UPSCALE_CASUAL_PCT', 0.40),
    lounge:         numEnv('NOSHOW_LOUNGE_PCT',         0.40),
    casual:         numEnv('NOSHOW_CASUAL_PCT',         0.40),
  } as Record<string, number>,

  // ── Cancellation refund windows ───────────────────────────────────────────
  /** Hours before reservation time at which full (100%) refund is given. */
  CANCEL_FULL_REFUND_HOURS:    numEnv('CANCEL_FULL_REFUND_HOURS',    24),
  /** Hours before at which partial refund applies (between full and no-refund). */
  CANCEL_PARTIAL_REFUND_HOURS: numEnv('CANCEL_PARTIAL_REFUND_HOURS', 12),
  /** Fraction refunded in the partial window (default 50%). */
  CANCEL_PARTIAL_REFUND_PCT:   numEnv('CANCEL_PARTIAL_REFUND_PCT',  0.50),
  /** Extra bonus fraction given to guest when the VENDOR cancels (default 10%). */
  VENDOR_CANCEL_BONUS_PCT:     numEnv('VENDOR_CANCEL_BONUS_PCT',    0.10),

  // ── Per-cover success fee (NGN, charged to vendor per checked-in seat) ────
  // Basic-tier flat fee = ₦1,500 per cover across all venue types.
  // Reduced by subscription tier via PER_COVER_TIER_MULTIPLIER below.
  PER_COVER_FEE: {
    fine_dining:    numEnv('COVER_FEE_FINE_DINING',    1500),
    upscale_casual: numEnv('COVER_FEE_UPSCALE_CASUAL', 1500),
    lounge:         numEnv('COVER_FEE_LOUNGE',         1500),
    casual:         numEnv('COVER_FEE_CASUAL',         1500),
  } as Record<string, number>,

  /** Multiplier applied to per-cover fee based on vendor subscription tier. */
  PER_COVER_TIER_MULTIPLIER: {
    basic: numEnv('COVER_MULTIPLIER_BASIC', 1.0),  // full ₦1,500
    pro:   numEnv('COVER_MULTIPLIER_PRO',   0.5),  // 50% → ₦750
    elite: numEnv('COVER_MULTIPLIER_ELITE', 0.0),  // waived entirely
  } as Record<string, number>,

  // ── Subscription tiers (NGN / month) ─────────────────────────────────────
  SUBSCRIPTION: {
    basic: 0,  // Always free — never charge for Basic
    pro:   numEnv('SUBSCRIPTION_PRO_NGN',   30000),
    elite: numEnv('SUBSCRIPTION_ELITE_NGN', 85000),
  } as Record<string, number>,

  // ── Gifting ───────────────────────────────────────────────────────────────
  /** Platform fee charged to the gift sender (fraction of creditAmount). */
  GIFT_FEE_PCT:           numEnv('GIFT_FEE_PCT',            0.08),
  /** Days a pending gift stays open before expiring and refunding sender. */
  GIFT_CLAIM_WINDOW_DAYS: numEnv('GIFT_CLAIM_WINDOW_DAYS',  30),

  // ── Vendor reliability score & badge ─────────────────────────────────────
  /** Rolling window (days) over which reliability score is computed. */
  RELIABILITY_WINDOW_DAYS: numEnv('RELIABILITY_WINDOW_DAYS', 90),
  /** Score threshold to start the badge qualification clock. */
  BADGE_THRESHOLD:          numEnv('BADGE_THRESHOLD',         0.95),
  /** Days the score must stay ≥ BADGE_THRESHOLD to award the badge. */
  BADGE_SUSTAINED_DAYS:     numEnv('BADGE_SUSTAINED_DAYS',    60),

  // ── LEGAL GATE ────────────────────────────────────────────────────────────
  /**
   * Keep FALSE until a licensed payment partner is integrated and counsel
   * has signed off. Flipping to true is the ONLY gate for cash withdrawal.
   */
  VENDOR_WITHDRAWAL_ENABLED: boolEnv('VENDOR_WITHDRAWAL_ENABLED', false),
};

// ── Helper resolvers ─────────────────────────────────────────────────────────

function numEnv(key: string, fallback: number): number {
  const v = process.env[key];
  const n = Number(v);
  return v != null && v !== '' && !Number.isNaN(n) ? n : fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  return v != null && v !== '' ? v === 'true' : fallback;
}
