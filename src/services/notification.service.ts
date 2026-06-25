import { db } from '@/lib/db';
import { sendEmail } from './email.service';
import { sendSms } from './sms.service';
import {
  resolvePreferences,
  resolveVendorPreferences,
  type NotificationCategory,
  type VendorNotificationCategory,
} from '@/lib/notifications/preferences';

/**
 * Unified Notification Service
 * Handles push (Expo), email, and SMS notifications with DB persistence and
 * per-user preference gating. A notification carries a `category` (e.g.
 * 'reservations', 'reminders') — if the user disabled that category in
 * Settings → Notifications, NOTHING is delivered on any channel. That is what
 * makes the preference toggle actually take effect.
 */

// ============================================================================
// EXPO PUSH NOTIFICATIONS
// ============================================================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return [];

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Expo push send error:', error);
    return [];
  }
}

// ============================================================================
// CORE: SEND + PERSIST
// ============================================================================

interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: Array<'push' | 'email' | 'sms'>;
  /** Preference category that gates delivery. Omit for transactional/critical sends that always go out. */
  category?: NotificationCategory;
  /** Optional richer email content; falls back to a wrapper around title/body. */
  email?: { subject?: string; html?: string };
  /** Optional SMS text; falls back to body. */
  sms?: string;
}

/** Minimal branded HTML wrapper for notification emails that have no bespoke template. */
function defaultEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#0f2547;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#0f2547;margin:0 0 12px">${title}</h2>
    <p style="font-size:15px;color:#333">${body}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="font-size:12px;color:#7a8fa6">© ${new Date().getFullYear()} Bucr — Your table, actually waiting.</p>
  </body></html>`;
}

/**
 * Send a notification across channels, gated by the user's preference for
 * `category`, and persist each channel's real outcome.
 */
export async function sendNotification(params: SendNotificationParams) {
  const { userId, type, title, body, data, channels = ['push'], category, email, sms } = params;

  const results: Array<{ channel: string; status: string; error?: string }> = [];

  // Get user's push token + contact info + preferences
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pushToken: true, email: true, phone: true, notificationPreferences: true },
  });

  if (!user) {
    console.error(`Notification: user ${userId} not found`);
    return results;
  }

  // Preference gate — a disabled category suppresses ALL channels.
  if (category) {
    const prefs = resolvePreferences(user.notificationPreferences);
    if (!prefs[category]) {
      return [{ channel: 'all', status: 'skipped', error: 'user_preference_disabled' }];
    }
  }

  for (const channel of channels) {
    let status = 'sent';
    let error: string | undefined;

    try {
      if (channel === 'push') {
        if (user.pushToken) {
          const pushResults = await sendExpoPush([{
            to: user.pushToken,
            title,
            body,
            data: data as Record<string, unknown>,
            sound: 'default',
          }]);
          if (pushResults[0]?.status === 'error') {
            status = 'failed';
            error = pushResults[0].message;
          }
        } else {
          status = 'skipped';
          error = 'No push token registered';
        }
      } else if (channel === 'email') {
        if (user.email) {
          const res = await sendEmail({
            to: user.email,
            subject: email?.subject || title,
            html: email?.html || defaultEmailHtml(title, body),
            text: body,
          });
          if (!res.success) {
            status = 'failed';
            error = typeof res.error === 'string' ? res.error : 'Email send failed';
          }
        } else {
          status = 'skipped';
          error = 'No email address';
        }
      } else if (channel === 'sms') {
        if (user.phone) {
          const res = await sendSms({ to: user.phone, message: sms || body });
          if (!res.success) {
            status = 'failed';
            error = res.error || 'SMS send failed';
          }
        } else {
          status = 'skipped';
          error = 'No phone number';
        }
      }
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Persist to DB
    await db.notification.create({
      data: {
        userId,
        type,
        channel,
        title,
        body,
        data: (data || {}) as Record<string, string | number | boolean>,
        status,
        sentAt: status === 'sent' ? new Date() : null,
        error,
      },
    });

    results.push({ channel, status, error });
  }

  return results;
}

// ============================================================================
// CONVENIENCE: TYPED NOTIFICATION SENDERS
// ============================================================================

export async function notifyReservationConfirmed(userId: string, params: {
  vendorName: string;
  date: string;
  time: string;
  reference: string;
}) {
  // In-app/push feed entry. The rich confirmation email (QR/PIN) is sent by the
  // reservation route, also gated by the 'reservations' preference.
  return sendNotification({
    userId,
    type: 'reservation_confirmed',
    category: 'reservations',
    title: 'Reservation Confirmed!',
    body: `Your reservation at ${params.vendorName} on ${params.date} at ${params.time} is confirmed.`,
    data: { reference: params.reference, screen: 'booking' },
    channels: ['push'],
  });
}

export async function notifyWaitlistReady(userId: string, params: {
  vendorName: string;
  partySize: number;
  holdMinutes: number;
}) {
  // A table opened up — this is time-critical, so it goes out on every channel
  // (push + SMS + email) and is NOT gated by a preference category.
  return sendNotification({
    userId,
    type: 'waitlist_ready',
    title: `Your table at ${params.vendorName} is ready!`,
    body: `A table for ${params.partySize} just opened up at ${params.vendorName}. Please head over within ${params.holdMinutes} minutes to claim it.`,
    data: { screen: 'bookings' },
    channels: ['push', 'sms', 'email'],
    sms: `Bucr: your table for ${params.partySize} at ${params.vendorName} is ready! Arrive within ${params.holdMinutes} mins to claim it.`,
  });
}

export async function notifyReservationReminder(userId: string, params: {
  vendorName: string;
  time: string;
  reference: string;
}) {
  return sendNotification({
    userId,
    type: 'reservation_reminder',
    category: 'reminders',
    title: 'Reservation Tomorrow',
    body: `Reminder: You have a reservation at ${params.vendorName} tomorrow at ${params.time}. Show up to earn bonus credits!`,
    data: { reference: params.reference, screen: 'booking' },
    channels: ['push', 'sms'],
    sms: `Reminder: Your reservation at ${params.vendorName} is tomorrow at ${params.time}. Ref: ${params.reference}. Show up to get your deposit back + bonus! - Bucr`,
  });
}

export async function notifyOrderStatusUpdate(userId: string, params: {
  vendorName: string;
  status: string;
  reference: string;
}) {
  const statusMessages: Record<string, string> = {
    confirmed: `Your order from ${params.vendorName} has been confirmed!`,
    preparing: `${params.vendorName} is preparing your order.`,
    ready: `Your order from ${params.vendorName} is ready for pickup!`,
    out_for_delivery: `Your order from ${params.vendorName} is on the way!`,
    delivered: `Your order from ${params.vendorName} has been delivered.`,
    cancelled: `Your order from ${params.vendorName} has been cancelled.`,
  };

  return sendNotification({
    userId,
    type: 'order_status',
    title: 'Order Update',
    body: statusMessages[params.status] || `Order update: ${params.status}`,
    data: { reference: params.reference, status: params.status, screen: 'order' },
    channels: ['push'],
  });
}

export async function notifyCreditExpiring(userId: string, params: {
  amount: number;
  daysLeft: number;
}) {
  return sendNotification({
    userId,
    type: 'credit_expiry',
    category: 'credits',
    title: 'Credits Expiring Soon',
    body: `${params.amount} credits will expire in ${params.daysLeft} days. Use them before they expire!`,
    data: { screen: 'wallet' },
    channels: ['push'],
  });
}

export async function notifyNoShow(userId: string, params: {
  vendorName: string;
  creditsForfeited: number;
  creditsReturned?: number;
}) {
  const returnedNote = params.creditsReturned && params.creditsReturned > 0
    ? ` ${params.creditsReturned} credits have been returned to your wallet.`
    : '';
  return sendNotification({
    userId,
    type: 'no_show',
    category: 'reservations',
    title: 'Reservation No-Show',
    body: `You missed your reservation at ${params.vendorName}. ${params.creditsForfeited} credits were forfeited.${returnedNote}`,
    data: { screen: 'wallet' },
    channels: ['push'],
  });
}

export async function notifyCheckInBonus(userId: string, params: {
  vendorName: string;
  bonusCredits: number;
  totalRefunded: number;
}) {
  return sendNotification({
    userId,
    type: 'checkin_bonus',
    category: 'reservations',
    title: 'Check-in Bonus!',
    body: `Thanks for showing up at ${params.vendorName}! ${params.totalRefunded} credits refunded (includes ${params.bonusCredits} bonus).`,
    data: { screen: 'wallet' },
    channels: ['push'],
  });
}

// ============================================================================
// VENDOR-FACING NOTIFICATIONS
// ============================================================================

/**
 * Notify a vendor (its owner User) about activity at their venue, gated by the
 * vendor's own notification preferences. Persists to the owner's notification
 * feed and pushes/emails per channel. This is what powers the vendor portal's
 * Settings → Notifications toggles — disabling a category stops delivery.
 */
async function notifyVendorOwner(params: {
  vendorId: string;
  category: VendorNotificationCategory;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: Array<'push' | 'email'>;
}) {
  const vendor = await db.vendor.findUnique({
    where: { id: params.vendorId },
    select: { ownerId: true, notificationPreferences: true },
  });
  if (!vendor?.ownerId) return;

  const prefs = resolveVendorPreferences(vendor.notificationPreferences);
  if (!prefs[params.category]) return; // setting disabled → no delivery

  const channels = params.channels ?? ['push'];
  // Reuse the core sender for the owner User (no diner-category gate here;
  // vendor-side gating already happened above).
  return sendNotification({
    userId: vendor.ownerId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data,
    channels,
  });
}

export function notifyVendorNewReservation(vendorId: string, params: {
  guestName: string;
  date: string;
  time: string;
  partySize: number;
  reference: string;
}) {
  return notifyVendorOwner({
    vendorId,
    category: 'newReservations',
    type: 'vendor_new_reservation',
    title: 'New reservation',
    body: `${params.guestName} booked a table for ${params.partySize} on ${params.date} at ${params.time}.`,
    data: { reference: params.reference, screen: 'reservations' },
    channels: ['push', 'email'],
  });
}

export function notifyVendorCancellation(vendorId: string, params: {
  guestName: string;
  date: string;
  time: string;
  reference: string;
  reason: 'cancelled' | 'no_show';
}) {
  const verb = params.reason === 'no_show' ? 'did not show up for' : 'cancelled';
  return notifyVendorOwner({
    vendorId,
    category: 'cancellations',
    type: 'vendor_cancellation',
    title: params.reason === 'no_show' ? 'Guest no-show' : 'Reservation cancelled',
    body: `${params.guestName} ${verb} their reservation on ${params.date} at ${params.time}.`,
    data: { reference: params.reference, screen: 'reservations' },
    channels: ['push', 'email'],
  });
}

export function notifyVendorNewOrder(vendorId: string, params: {
  guestName: string;
  orderType: string;
  total: number;
  reference: string;
}) {
  return notifyVendorOwner({
    vendorId,
    category: 'newOrders',
    type: 'vendor_new_order',
    title: 'New order',
    body: `${params.guestName} placed a ${params.orderType} order (₦${params.total.toLocaleString()}). Ref: ${params.reference}.`,
    data: { reference: params.reference, screen: 'orders' },
    channels: ['push', 'email'],
  });
}

export function notifyVendorNewReview(vendorId: string, params: {
  guestName: string;
  rating: number;
}) {
  return notifyVendorOwner({
    vendorId,
    category: 'newReviews',
    type: 'vendor_new_review',
    title: 'New review',
    body: `${params.guestName} left you a ${params.rating}-star review.`,
    data: { screen: 'reviews' },
    channels: ['push'],
  });
}

// ============================================================================
// QUERY: USER NOTIFICATIONS
// ============================================================================

export async function getUserNotifications(userId: string, params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const { page = 1, limit = 20, unreadOnly = false } = params || {};
  const skip = (page - 1) * limit;

  const where = {
    userId,
    channel: 'push',
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, channel: 'push', readAt: null } }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, readAt: null, channel: 'push' },
    data: { readAt: new Date() },
  });
}
