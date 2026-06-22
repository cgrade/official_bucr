import { db } from '@/lib/db';

/**
 * Notification preference categories. These are the SINGLE source of truth for
 * both the /api/users/notification-preferences endpoint and every place that
 * decides whether to actually send a notification. The mobile settings screen
 * mirrors these keys.
 *
 * A category maps a class of notifications to an on/off switch the user controls
 * in Settings → Notifications. When a category is off, no notification of that
 * class is delivered on ANY channel (push/email/sms) — that's what makes the
 * setting actually "take effect".
 */
export const NOTIFICATION_CATEGORIES = [
  'reservations', // booking confirmed / updated / cancelled
  'reminders',    // 24h-before booking reminders
  'credits',      // credits earned / spent / expiring / no-show forfeit
  'gifts',        // received a credit gift
  'reviews',      // review requests after a visit
  'promotions',   // marketing / special offers
  'reliability',  // book-with-confidence badge changes
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Defaults — promotions opt-in (off), everything else on. */
export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationCategory, boolean> = {
  reservations: true,
  reminders: true,
  credits: true,
  gifts: true,
  reviews: true,
  promotions: false,
  reliability: true,
};

/** Merge stored prefs (Json) over defaults, keeping only known keys. */
export function resolvePreferences(
  stored: unknown
): Record<NotificationCategory, boolean> {
  const resolved = { ...DEFAULT_NOTIFICATION_PREFS };
  if (stored && typeof stored === 'object') {
    for (const key of NOTIFICATION_CATEGORIES) {
      const v = (stored as Record<string, unknown>)[key];
      if (typeof v === 'boolean') resolved[key] = v;
    }
  }
  return resolved;
}

/** Whether a category is enabled given already-loaded stored prefs. */
export function isCategoryEnabled(
  stored: unknown,
  category: NotificationCategory
): boolean {
  return resolvePreferences(stored)[category];
}

/**
 * Load a user's prefs from the DB. Use the channel-level senders' own user
 * lookups where possible to avoid an extra round-trip; this is for callers that
 * gate a direct email/SMS send (e.g. the reminders cron) and don't otherwise
 * load the user's preferences.
 */
export async function getUserNotificationPrefs(
  userId: string
): Promise<Record<NotificationCategory, boolean>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });
  return resolvePreferences(user?.notificationPreferences);
}

/** Convenience: load + check a single category for a user. */
export async function isNotificationEnabled(
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  const prefs = await getUserNotificationPrefs(userId);
  return prefs[category];
}

// ============================================================================
// VENDOR notification preferences
// ============================================================================

/** Categories a vendor controls in Settings → Notifications. */
export const VENDOR_NOTIFICATION_CATEGORIES = [
  'newReservations',  // a guest books / modifies a reservation
  'cancellations',    // a guest cancels or no-shows
  'newOrders',        // a guest places a takeout order
  'newReviews',       // a guest leaves a review
  'weeklyReports',    // weekly performance summary
] as const;

export type VendorNotificationCategory =
  (typeof VENDOR_NOTIFICATION_CATEGORIES)[number];

export const DEFAULT_VENDOR_NOTIFICATION_PREFS: Record<
  VendorNotificationCategory,
  boolean
> = {
  newReservations: true,
  cancellations: true,
  newOrders: true,
  newReviews: true,
  weeklyReports: true,
};

export function resolveVendorPreferences(
  stored: unknown
): Record<VendorNotificationCategory, boolean> {
  const resolved = { ...DEFAULT_VENDOR_NOTIFICATION_PREFS };
  if (stored && typeof stored === 'object') {
    for (const key of VENDOR_NOTIFICATION_CATEGORIES) {
      const v = (stored as Record<string, unknown>)[key];
      if (typeof v === 'boolean') resolved[key] = v;
    }
  }
  return resolved;
}

export function isVendorCategoryEnabled(
  stored: unknown,
  category: VendorNotificationCategory
): boolean {
  return resolveVendorPreferences(stored)[category];
}
