import { db } from '@/lib/db';

/**
 * Achievement definitions — earned automatically based on real vendor data.
 * These are the only valid badge types in the system; none are seeded manually.
 *
 * badgeType is a stable key — used to upsert (never create duplicates).
 */
const ACHIEVEMENT_RULES: Array<{
  badgeType: string;
  title: string;
  description: string;
  icon: string;
  check: (v: {
    verificationStatus: string;
    subscriptionTier: string;
    totalBookings: number;
    averageRating: number | null;
    totalReviews: number;
    bookWithConfidence: boolean;
  }) => boolean;
}> = [
  {
    badgeType:   'verified',
    title:       'Verified Business',
    description: 'All business documents reviewed and approved',
    icon:        '✅',
    check: (v) => v.verificationStatus === 'approved',
  },
  {
    badgeType:   'premium_partner',
    title:       'Premium Partner',
    description: 'Active Pro or Elite subscription member',
    icon:        '🏆',
    check: (v) => v.subscriptionTier === 'pro' || v.subscriptionTier === 'elite',
  },
  {
    badgeType:   'trusted',
    title:       'Trusted Vendor',
    description: '100+ successful reservations completed',
    icon:        '⭐',
    check: (v) => v.totalBookings >= 100,
  },
  {
    badgeType:   'top_rated',
    title:       'Top Rated',
    description: 'Average rating of 4.5+ with 10+ reviews',
    icon:        '🌟',
    check: (v) => (v.averageRating ?? 0) >= 4.5 && v.totalReviews >= 10,
  },
  {
    badgeType:   'book_with_confidence',
    title:       'Book With Confidence',
    description: '95%+ guest check-in reliability sustained for 60 days',
    icon:        '🛡️',
    check: (v) => v.bookWithConfidence === true,
  },
];

/**
 * Recomputes which achievements a vendor has earned based on live data.
 * Adds newly-earned achievements and removes ones no longer valid.
 * Call this after: document approval, subscription change, reservation completion, review creation.
 */
export async function syncVendorAchievements(vendorId: string): Promise<void> {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: {
      verificationStatus: true,
      subscriptionTier:   true,
      totalBookings:      true,
      averageRating:      true,
      totalReviews:       true,
      bookWithConfidence: true,
      achievements:       { select: { id: true, badgeType: true } },
    },
  });

  if (!vendor) return;

  const earned  = new Set(vendor.achievements.map((a) => a.badgeType).filter(Boolean));
  const byType  = Object.fromEntries(vendor.achievements.map((a) => [a.badgeType, a.id]));

  for (const rule of ACHIEVEMENT_RULES) {
    const shouldHave = rule.check({
      verificationStatus: vendor.verificationStatus,
      subscriptionTier:   vendor.subscriptionTier,
      totalBookings:      vendor.totalBookings ?? 0,
      averageRating:      vendor.averageRating,
      totalReviews:       vendor.totalReviews ?? 0,
      bookWithConfidence: vendor.bookWithConfidence ?? false,
    });

    if (shouldHave && !earned.has(rule.badgeType)) {
      // Earn it
      await db.achievement.create({
        data: {
          vendorId:    vendorId,
          title:       rule.title,
          description: rule.description,
          icon:        rule.icon,
          badgeType:   rule.badgeType,
        },
      });
    } else if (!shouldHave && earned.has(rule.badgeType)) {
      // Revoke it (e.g. subscription expired)
      await db.achievement.delete({ where: { id: byType[rule.badgeType!]! } });
    }
  }
}

/**
 * Convenience: sync all approved vendors (e.g. via a nightly cron).
 */
export async function syncAllVendorAchievements(): Promise<void> {
  const vendors = await db.vendor.findMany({
    where: { deletedAt: null, verificationStatus: 'approved' },
    select: { id: true },
  });
  await Promise.allSettled(vendors.map((v) => syncVendorAchievements(v.id)));
}
