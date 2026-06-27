import { db } from '@/lib/db';
import { config } from '@/lib/config';
import { ECONOMICS } from '@/lib/config/economics';
import { syncVendorAchievements } from './achievement.service';

// ============================================================================
// TYPES
// ============================================================================

// 'elite' is the renamed tier (was 'premium'). The Prisma enum migration in
// Phase 5 will rename the DB enum value. Until then we use a string union here.
export type SubscriptionTierInput = 'basic' | 'pro' | 'elite';

export interface ActivateSubscriptionParams {
  vendorId: string;
  tier: SubscriptionTierInput;
  paymentId: string;
  amountPaidKobo: number;
  durationMonths?: number;
}

export interface SubscriptionDetails {
  id: string;
  vendorId: string;
  tier: string;
  status: string;
  startsAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  daysRemaining: number;
  features: string[];
  price: number;
  /** A lower tier scheduled to apply when the current paid period ends (or null). */
  scheduledTier?: SubscriptionTierInput | null;
}

/** Tier ranking for comparing upgrade vs downgrade. */
export const TIER_RANK: Record<SubscriptionTierInput, number> = { basic: 0, pro: 1, elite: 2 };

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export async function activateSubscription(params: ActivateSubscriptionParams) {
  const { vendorId, tier, paymentId, amountPaidKobo, durationMonths = 1 } = params;

  // Basic is free — no Paystack call reaches here, but guard defensively
  if (tier === 'basic' && amountPaidKobo > 0) {
    throw new Error('Basic plan is free; unexpected payment amount');
  }

  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  const now = new Date();
  let startsAt = now;
  if (vendor.subscriptionExpiresAt && vendor.subscriptionExpiresAt > now) {
    startsAt = vendor.subscriptionExpiresAt;
  }

  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  const subscription = await db.vendorSubscription.create({
    data: {
      vendorId,
      tier: tier as any,
      status: 'active',
      amountPaidKobo,
      paymentId,
      startsAt,
      expiresAt,
      autoRenew: false,
    },
  });

  await db.vendor.update({
    where: { id: vendorId },
    data: {
      subscriptionTier: tier as any,
      subscriptionExpiresAt: tier === 'basic' ? null : expiresAt,
    },
  });

  return subscription;
}

export async function getVendorSubscription(vendorId: string): Promise<SubscriptionDetails | null> {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, subscriptionTier: true, subscriptionExpiresAt: true },
  });

  if (!vendor) return null;

  const latestSubscription = await db.vendorSubscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const expiresAt = vendor.subscriptionExpiresAt || now;
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const tierKey = (vendor.subscriptionTier as string).replace('premium', 'elite') as SubscriptionTierInput;
  const tierConfig = (config.subscriptions as unknown as Record<string, { name: string; priceNgn: number; features: string[] }>)[tierKey]
    ?? config.subscriptions.basic;

  return {
    id: latestSubscription?.id || '',
    vendorId: vendor.id,
    tier: tierKey,
    status: tierKey === 'basic' || daysRemaining > 0 ? 'active' : 'expired',
    startsAt: latestSubscription?.startsAt || now,
    expiresAt,
    autoRenew: latestSubscription?.autoRenew || false,
    daysRemaining: tierKey === 'basic' ? Infinity : daysRemaining,
    features: [...tierConfig.features],
    price: tierConfig.priceNgn,
    scheduledTier: (latestSubscription?.scheduledTier as SubscriptionTierInput | undefined) ?? null,
  };
}

export async function getSubscriptionHistory(
  vendorId: string,
  options: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    db.vendorSubscription.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.vendorSubscription.count({ where: { vendorId } }),
  ]);

  return { subscriptions, total, page, limit };
}

export async function cancelSubscription(vendorId: string): Promise<void> {
  const subscription = await db.vendorSubscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) throw new Error('No active subscription found');

  await db.vendorSubscription.update({
    where: { id: subscription.id },
    data: { status: 'cancelled', autoRenew: false, cancelledAt: new Date() },
  });
  // Access continues until expiry; downgrade cron handles the rest
}

/**
 * Schedule a downgrade to a LOWER tier that takes effect at the end of the current paid
 * period — the vendor keeps (and keeps the full value of) their current tier until then.
 * No refund/proration: closed-loop, money only flows TO Bucr. The downgrade is applied by
 * checkExpiredSubscriptions at expiry. (A lower *paid* tier can't be auto-charged here, so
 * at expiry the vendor lands on Basic and is prompted to subscribe to the chosen tier.)
 */
export async function scheduleDowngrade(vendorId: string, targetTier: SubscriptionTierInput): Promise<{ effectiveAt: Date }> {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: { subscriptionTier: true, subscriptionExpiresAt: true },
  });
  if (!vendor) throw new Error('Vendor not found');

  const currentTier = (vendor.subscriptionTier as string).replace('premium', 'elite') as SubscriptionTierInput;
  if (currentTier === 'basic') throw new Error('You are on the free Basic plan — nothing to downgrade.');
  if (TIER_RANK[targetTier] >= TIER_RANK[currentTier]) {
    throw new Error('Choose a lower tier to downgrade. Use upgrade to move up.');
  }

  const subscription = await db.vendorSubscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!subscription) throw new Error('No active subscription found');

  await db.vendorSubscription.update({
    where: { id: subscription.id },
    data: { scheduledTier: targetTier as any, autoRenew: false },
  });

  return { effectiveAt: vendor.subscriptionExpiresAt ?? subscription.expiresAt };
}

/** Cancel a pending scheduled downgrade (vendor changed their mind). */
export async function clearScheduledDowngrade(vendorId: string): Promise<void> {
  await db.vendorSubscription.updateMany({
    where: { vendorId, status: 'active', scheduledTier: { not: null } },
    data: { scheduledTier: null },
  });
}

export async function toggleAutoRenew(vendorId: string, autoRenew: boolean): Promise<void> {
  const subscription = await db.vendorSubscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) throw new Error('No active subscription found');

  await db.vendorSubscription.update({
    where: { id: subscription.id },
    data: { autoRenew },
  });
}

export async function upgradeSubscription(params: {
  vendorId: string;
  newTier: SubscriptionTierInput;
  paymentId: string;
  amountPaidKobo: number;
}) {
  const { vendorId, newTier, paymentId, amountPaidKobo } = params;

  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  const tierOrder: SubscriptionTierInput[] = ['basic', 'pro', 'elite'];
  const currentTierNorm = (vendor.subscriptionTier as string).replace('premium', 'elite') as SubscriptionTierInput;
  if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(currentTierNorm)) {
    throw new Error('Can only upgrade to a higher tier');
  }

  const now = new Date();
  const expiresAt =
    vendor.subscriptionExpiresAt && vendor.subscriptionExpiresAt > now
      ? vendor.subscriptionExpiresAt
      : new Date(now.setMonth(now.getMonth() + 1));

  const subscription = await db.vendorSubscription.create({
    data: {
      vendorId,
      tier: newTier as any,
      status: 'active',
      amountPaidKobo,
      paymentId,
      startsAt: new Date(),
      expiresAt,
      autoRenew: false,
    },
  });

  await db.vendor.update({
    where: { id: vendorId },
    data: { subscriptionTier: newTier as any },
  });

  // Sync achievements — Premium Partner badge is earned/revoked based on tier
  syncVendorAchievements(vendorId).catch(() => {});

  return subscription;
}

// ============================================================================
// SUBSCRIPTION TIER INFO
// ============================================================================

export function getSubscriptionTiers() {
  return {
    basic: {
      name: 'Basic',
      priceNgn: ECONOMICS.SUBSCRIPTION.basic,
      priceKobo: 0,
      features: config.subscriptions.basic.features,
      recommended: false,
      free: true,
    },
    pro: {
      name: 'Pro',
      priceNgn: ECONOMICS.SUBSCRIPTION.pro,
      priceKobo: ECONOMICS.SUBSCRIPTION.pro * 100,
      features: [...config.subscriptions.basic.features, ...config.subscriptions.pro.features],
      recommended: true,
      free: false,
    },
    elite: {
      name: 'Elite',
      priceNgn: ECONOMICS.SUBSCRIPTION.elite,
      priceKobo: ECONOMICS.SUBSCRIPTION.elite * 100,
      features: [
        ...config.subscriptions.basic.features,
        ...config.subscriptions.pro.features,
        ...config.subscriptions.elite.features,
      ],
      recommended: false,
      free: false,
    },
  };
}

export function getSubscriptionPrice(tier: SubscriptionTierInput): number {
  return ECONOMICS.SUBSCRIPTION[tier] * 100; // kobo
}

// ============================================================================
// EXPIRY CHECK (cron)
// ============================================================================

export async function checkExpiredSubscriptions(): Promise<number> {
  const now = new Date();

  const expiredVendors = await db.vendor.findMany({
    where: {
      subscriptionExpiresAt: { lt: now },
      subscriptionTier: { not: 'basic' },
      deletedAt: null,
    },
    select: { id: true, subscriptionTier: true },
  });

  for (const vendor of expiredVendors) {
    // A paid period that ended reverts to Basic. If the vendor had scheduled a downgrade
    // to a lower PAID tier, we can't auto-charge it here (no saved card) — so we still drop
    // to Basic and prompt them to subscribe to the chosen tier.
    const activeSub = await db.vendorSubscription.findFirst({
      where: { vendorId: vendor.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, scheduledTier: true },
    });

    await db.$transaction([
      db.vendor.update({
        where: { id: vendor.id },
        data: { subscriptionTier: 'basic', subscriptionExpiresAt: null },
      }),
      db.vendorSubscription.updateMany({
        where: { vendorId: vendor.id, status: 'active' },
        data: { status: 'expired' },
      }),
    ]);

    const scheduled = activeSub?.scheduledTier as SubscriptionTierInput | null | undefined;
    if (scheduled && scheduled !== 'basic') {
      const { notifyVendor } = await import('./vendor-message.service');
      notifyVendor({
        vendorId: vendor.id,
        category: 'system',
        subject: `Your plan ended — subscribe to ${scheduled.charAt(0).toUpperCase() + scheduled.slice(1)} to complete your downgrade`,
        body: `Your previous plan has ended and your account is now on Basic. To activate your scheduled downgrade to ${scheduled}, subscribe to it from your Subscription page.`,
        link: '/subscription',
        email: true,
      }).catch(() => {});
    }
  }

  return expiredVendors.length;
}

export async function getExpiringSubscriptions(daysAhead: number = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return db.vendor.findMany({
    where: {
      subscriptionExpiresAt: { gte: now, lte: futureDate },
      subscriptionTier: { not: 'basic' },
      deletedAt: null,
    },
    select: {
      id: true,
      ownerId: true,
      businessName: true,
      email: true,
      subscriptionTier: true,
      subscriptionExpiresAt: true,
    },
  });
}
