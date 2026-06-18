import { db } from '@/lib/db';
import { config } from '@/lib/config';
import { SubscriptionTier } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivateSubscriptionParams {
  vendorId: string;
  tier: 'basic' | 'pro' | 'premium';
  paymentId: string;
  amountPaidKobo: number;
  durationMonths?: number;
}

export interface SubscriptionDetails {
  id: string;
  vendorId: string;
  tier: SubscriptionTier;
  status: string;
  startsAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  daysRemaining: number;
  features: string[];
  price: number;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export async function activateSubscription(params: ActivateSubscriptionParams) {
  const { vendorId, tier, paymentId, amountPaidKobo, durationMonths = 1 } = params;

  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const now = new Date();
  
  // If vendor has an active subscription, extend from expiry date
  let startsAt = now;
  if (vendor.subscriptionExpiresAt && vendor.subscriptionExpiresAt > now) {
    startsAt = vendor.subscriptionExpiresAt;
  }

  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  // Create subscription record
  const subscription = await db.vendorSubscription.create({
    data: {
      vendorId,
      tier,
      status: 'active',
      amountPaidKobo,
      paymentId,
      startsAt,
      expiresAt,
      autoRenew: false,
    },
  });

  // Update vendor's subscription info
  await db.vendor.update({
    where: { id: vendorId },
    data: {
      subscriptionTier: tier,
      subscriptionExpiresAt: expiresAt,
    },
  });

  return subscription;
}

export async function getVendorSubscription(vendorId: string): Promise<SubscriptionDetails | null> {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!vendor) {
    return null;
  }

  const latestSubscription = await db.vendorSubscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const expiresAt = vendor.subscriptionExpiresAt || now;
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  const tierConfig = config.subscriptions[vendor.subscriptionTier];

  return {
    id: latestSubscription?.id || '',
    vendorId: vendor.id,
    tier: vendor.subscriptionTier,
    status: daysRemaining > 0 ? 'active' : 'expired',
    startsAt: latestSubscription?.startsAt || now,
    expiresAt,
    autoRenew: latestSubscription?.autoRenew || false,
    daysRemaining,
    features: [...tierConfig.features] as string[],
    price: tierConfig.priceNgn,
  };
}

export async function getSubscriptionHistory(vendorId: string, options: {
  page?: number;
  limit?: number;
} = {}) {
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

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  await db.vendorSubscription.update({
    where: { id: subscription.id },
    data: {
      status: 'cancelled',
      autoRenew: false,
      cancelledAt: new Date(),
    },
  });

  // Note: We don't immediately downgrade - they keep access until expiry
}

export async function toggleAutoRenew(vendorId: string, autoRenew: boolean): Promise<void> {
  const subscription = await db.vendorSubscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  await db.vendorSubscription.update({
    where: { id: subscription.id },
    data: { autoRenew },
  });
}

export async function upgradeSubscription(params: {
  vendorId: string;
  newTier: 'basic' | 'pro' | 'premium';
  paymentId: string;
  amountPaidKobo: number;
}) {
  const { vendorId, newTier, paymentId, amountPaidKobo } = params;

  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Calculate prorated amount if upgrading mid-cycle
  const currentTierPrice = config.subscriptions[vendor.subscriptionTier].priceNgn;
  const newTierPrice = config.subscriptions[newTier].priceNgn;

  if (newTierPrice <= currentTierPrice) {
    throw new Error('Can only upgrade to a higher tier');
  }

  const now = new Date();
  
  // For upgrades, apply immediately but keep same expiry date
  const expiresAt = vendor.subscriptionExpiresAt && vendor.subscriptionExpiresAt > now
    ? vendor.subscriptionExpiresAt
    : new Date(now.setMonth(now.getMonth() + 1));

  // Create new subscription record for the upgrade
  const subscription = await db.vendorSubscription.create({
    data: {
      vendorId,
      tier: newTier,
      status: 'active',
      amountPaidKobo,
      paymentId,
      startsAt: new Date(),
      expiresAt,
      autoRenew: false,
    },
  });

  // Update vendor's subscription tier
  await db.vendor.update({
    where: { id: vendorId },
    data: {
      subscriptionTier: newTier,
    },
  });

  return subscription;
}

// ============================================================================
// SUBSCRIPTION TIERS INFO
// ============================================================================

export function getSubscriptionTiers() {
  return {
    basic: {
      name: config.subscriptions.basic.name,
      priceNgn: config.subscriptions.basic.priceNgn,
      priceKobo: config.subscriptions.basic.priceNgn * 100,
      features: config.subscriptions.basic.features,
      recommended: false,
    },
    pro: {
      name: config.subscriptions.pro.name,
      priceNgn: config.subscriptions.pro.priceNgn,
      priceKobo: config.subscriptions.pro.priceNgn * 100,
      features: [
        ...config.subscriptions.basic.features,
        ...config.subscriptions.pro.features,
      ],
      recommended: true,
    },
    premium: {
      name: config.subscriptions.premium.name,
      priceNgn: config.subscriptions.premium.priceNgn,
      priceKobo: config.subscriptions.premium.priceNgn * 100,
      features: [
        ...config.subscriptions.basic.features,
        ...config.subscriptions.pro.features,
        ...config.subscriptions.premium.features,
      ],
      recommended: false,
    },
  };
}

// ============================================================================
// EXPIRY CHECK (for cron jobs)
// ============================================================================

export async function checkExpiredSubscriptions(): Promise<number> {
  const now = new Date();

  // Find vendors with expired subscriptions
  const expiredVendors = await db.vendor.findMany({
    where: {
      subscriptionExpiresAt: { lt: now },
      subscriptionTier: { not: 'basic' },
      deletedAt: null,
    },
    select: { id: true, subscriptionTier: true },
  });

  // Downgrade to basic
  for (const vendor of expiredVendors) {
    await db.$transaction([
      db.vendor.update({
        where: { id: vendor.id },
        data: { subscriptionTier: 'basic' },
      }),
      db.vendorSubscription.updateMany({
        where: { vendorId: vendor.id, status: 'active' },
        data: { status: 'expired' },
      }),
    ]);
  }

  return expiredVendors.length;
}

export async function getExpiringSubscriptions(daysAhead: number = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return db.vendor.findMany({
    where: {
      subscriptionExpiresAt: {
        gte: now,
        lte: futureDate,
      },
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
