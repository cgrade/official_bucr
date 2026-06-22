/**
 * Integration tests — booking, check-in, no-show, and cancellation flows
 * hitting a real PostgreSQL database.
 *
 * Prerequisites:
 *   docker compose up -d  (Postgres on port 5433)
 *   npx prisma migrate deploy
 *
 * Run:  npx vitest run --config vitest.integration.config.ts tests/integration/booking-flows.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { ECONOMICS } from '@/lib/config/economics';
import {
  createReservation,
  checkInReservation,
  markNoShow,
  cancelReservation,
} from '@/services/reservation.service';
import { hashPassword } from '@/lib/auth/password';

// ── Seed data ─────────────────────────────────────────────────────────────
const seed = `int-${Date.now()}`;
let userId   = '';
let vendorId = '';
// Use 100× the largest venue-type deposit so the balance survives multiple test
// bookings regardless of how DEPOSIT_* env vars are configured.
const largestDeposit = Math.max(...Object.values(ECONOMICS.DEPOSIT_BY_VENUE_TYPE), ECONOMICS.DEPOSIT_DEFAULT);
let initialBalance = largestDeposit * 100;

beforeAll(async () => {
  const hash = await hashPassword('Test1234!');

  const user = await db.user.create({
    data: {
      email: `user-${seed}@test.bucr`,
      name: 'Integration Test User',
      passwordHash: hash,
      creditsBalance: initialBalance,
    },
  });
  userId = user.id;

  const vendor = await db.vendor.create({
    data: {
      ownerId: userId,
      businessName: `Integration Restaurant ${seed}`,
      slug: `int-restaurant-${seed}`,
      email: `vendor-${seed}@test.bucr`,
      phone: '+2348000000099',
      venueType: 'upscale_casual',
      verificationStatus: 'approved',
    } as any,
  });
  vendorId = vendor.id;
});

afterAll(async () => {
  // Clean up in dependency order; use catch() so partial cleanup never aborts cleanup
  await (db as any).coverCharge.deleteMany({ where: { vendorId } }).catch(() => {});
  await (db as any).platformRevenue.deleteMany({ where: { vendorId } }).catch(() => {});
  await db.guestProfile.deleteMany({ where: { vendorId } }).catch(() => {});
  await db.reservation.deleteMany({ where: { vendorId } }).catch(() => {});
  await db.vendorCreditTransaction
    .deleteMany({ where: { wallet: { vendorId } } })
    .catch(() => {});
  await db.vendorWallet.deleteMany({ where: { vendorId } }).catch(() => {});
  await db.vendor.delete({ where: { id: vendorId } }).catch(() => {});
  // User-linked cleanup
  await db.notification.deleteMany({ where: { userId } }).catch(() => {});
  await db.creditTransaction.deleteMany({ where: { userId } }).catch(() => {});
  await db.user.delete({ where: { id: userId } }).catch(() => {});
});

// Helper: reset balance to initialBalance (or a custom amount)
async function resetBalance(credits: number = initialBalance) {
  await db.user.update({ where: { id: userId }, data: { creditsBalance: credits } });
  await db.creditTransaction.deleteMany({ where: { userId } });
}

// ── Helper: flat deposit per reservation (party size irrelevant) ──────────
// The seeded vendor is upscale_casual, so the deposit is the venue-type default.
function expectedDeposit(_partySize?: number): number {
  return ECONOMICS.DEPOSIT_BY_VENUE_TYPE.upscale_casual ?? ECONOMICS.DEPOSIT_DEFAULT;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('booking → check-in happy path', () => {
  it('creates reservation, deducts deposit, check-in restores deposit + bonus + accrues cover fee', async () => {
    await resetBalance();
    const partySize = 2;
    const deposit = expectedDeposit(partySize);

    const reservation = await createReservation({
      userId, vendorId,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      time: '19:00',
      partySize,
    });

    // Deposit deducted correctly
    expect(reservation.creditsDeposited).toBe(deposit);
    const afterBook = await db.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
    expect(afterBook!.creditsBalance).toBe(initialBalance - deposit);

    // Check-in
    const checkIn = await checkInReservation(reservation.id, reservation.pin!, vendorId);
    const bonus = Math.floor(deposit * ECONOMICS.SHOWUP_BONUS_PCT);
    const afterCheckin = await db.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });

    expect(checkIn.creditsRefunded).toBe(deposit);
    expect(checkIn.bonusCredits).toBe(bonus);
    expect(afterCheckin!.creditsBalance).toBe(initialBalance + bonus); // net gain = bonus only

    // Per-cover fee accrued
    const charge = await (db as any).coverCharge.findFirst({ where: { reservationId: reservation.id } });
    expect(charge).not.toBeNull();
    const expectedFee = Math.round(
      ECONOMICS.PER_COVER_FEE['upscale_casual'] *
      ECONOMICS.PER_COVER_TIER_MULTIPLIER['basic'] *
      partySize
    );
    expect(charge.feeCharged).toBe(expectedFee);
  });
});

describe('booking → no-show split', () => {
  it('guest keeps 70%, vendor gets 20% marketing credits, platform gets remainder, no cover fee', async () => {
    await resetBalance();
    const partySize = 4;
    const deposit = expectedDeposit(partySize);

    const reservation = await createReservation({
      userId, vendorId,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      time: '20:00',
      partySize,
    });

    const balanceAfterBook = (await db.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } }))!.creditsBalance;

    const result = await markNoShow(reservation.id, vendorId);

    // Mirror the service's capping logic (vendorShare is capped at forfeit)
    const forfeitPct  = ECONOMICS.NOSHOW_FORFEIT_BY_VENUE['upscale_casual'];
    const forfeit     = Math.floor(deposit * forfeitPct);
    const guestKeeps  = deposit - forfeit;
    const vendorShare = Math.min(Math.floor(deposit * ECONOMICS.NOSHOW_VENDOR_PCT), forfeit);
    const platformShr = forfeit - vendorShare; // always ≥ 0

    expect(result.forfeit).toBe(forfeit);
    expect(result.guestKeeps).toBe(guestKeeps);
    expect(result.vendorShare).toBe(vendorShare);
    expect(result.platformShare).toBe(platformShr);
    expect(guestKeeps + vendorShare + platformShr).toBe(deposit); // no leakage

    // Guest balance: booking-balance + guestKeeps
    const finalBalance = (await db.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } }))!.creditsBalance;
    expect(finalBalance).toBe(balanceAfterBook + guestKeeps);

    // Vendor wallet has at least the vendor share
    if (vendorShare > 0) {
      const wallet = await db.vendorWallet.findUnique({ where: { vendorId }, select: { balance: true } });
      expect(wallet!.balance).toBeGreaterThanOrEqual(vendorShare);
    }

    // Platform revenue row exists
    const revenue = await (db as any).platformRevenue.findFirst({
      where: { sourceId: reservation.id, type: 'noshow_platform_share' },
    });
    if (platformShr > 0) {
      expect(revenue).not.toBeNull();
      expect(revenue.amountCredits).toBe(platformShr);
      expect(revenue.amountNgn).toBe(platformShr * ECONOMICS.CREDIT_VALUE_NGN);
    }

    // No cover charge on no-show
    const charge = await (db as any).coverCharge.findFirst({ where: { reservationId: reservation.id } });
    expect(charge).toBeNull();
  });
});

describe('cancellation refund tiers', () => {
  it('user cancels 25h before → full deposit returned (net zero)', async () => {
    await resetBalance();
    const partySize = 2;
    const deposit = expectedDeposit(partySize);

    // Use 3 days in the future so the cancellation is always >24h away
    // regardless of what time of day the test runs (avoids 19:00 drift).
    const reservation = await createReservation({
      userId, vendorId,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      time: '19:00',
      partySize,
    });

    const result = await cancelReservation(reservation.id, userId, 'user');

    expect(result.creditsRefunded).toBe(deposit);
    expect(result.creditsForfeited).toBe(0);

    // Balance should be back to 500
    const finalBalance = (await db.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } }))!.creditsBalance;
    expect(finalBalance).toBe(initialBalance);
  });

  it('vendor cancels → guest gets 100% + 10% bonus', async () => {
    await resetBalance();
    const partySize = 2;
    const deposit = expectedDeposit(partySize);
    const bonus = Math.floor(deposit * ECONOMICS.VENDOR_CANCEL_BONUS_PCT);

    const reservation = await createReservation({
      userId, vendorId,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      time: '19:00',
      partySize,
    });

    const result = await cancelReservation(reservation.id, userId, 'vendor');

    expect(result.creditsRefunded).toBe(deposit);
    expect(result.bonusCredits).toBe(bonus);

    const finalBalance = (await db.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } }))!.creditsBalance;
    expect(finalBalance).toBe(initialBalance + bonus); // gets back full deposit + 10% vendor-cancel bonus
  });
});
