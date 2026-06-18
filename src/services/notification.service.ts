import { db } from '@/lib/db';

/**
 * Unified Notification Service
 * Handles push (Expo), email, and SMS notifications with DB persistence.
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
}

/**
 * Send a notification via specified channels and persist to DB.
 */
export async function sendNotification(params: SendNotificationParams) {
  const { userId, type, title, body, data, channels = ['push'] } = params;

  const results: Array<{ channel: string; status: string; error?: string }> = [];

  // Get user's push token + contact info
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pushToken: true, email: true, phone: true },
  });

  if (!user) {
    console.error(`Notification: user ${userId} not found`);
    return results;
  }

  for (const channel of channels) {
    let status = 'sent';
    let error: string | undefined;

    try {
      if (channel === 'push' && user.pushToken) {
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
      } else if (channel === 'push' && !user.pushToken) {
        status = 'skipped';
        error = 'No push token registered';
      }
      // Email and SMS are handled by their own services — just record
      else if (channel === 'email' && !user.email) {
        status = 'skipped';
        error = 'No email address';
      } else if (channel === 'sms' && !user.phone) {
        status = 'skipped';
        error = 'No phone number';
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
  return sendNotification({
    userId,
    type: 'reservation_confirmed',
    title: 'Reservation Confirmed!',
    body: `Your reservation at ${params.vendorName} on ${params.date} at ${params.time} is confirmed.`,
    data: { reference: params.reference, screen: 'booking' },
    channels: ['push'],
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
    title: 'Reservation Tomorrow',
    body: `Reminder: You have a reservation at ${params.vendorName} tomorrow at ${params.time}. Show up to earn bonus credits!`,
    data: { reference: params.reference, screen: 'booking' },
    channels: ['push'],
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
    title: 'Credits Expiring Soon',
    body: `${params.amount} credits will expire in ${params.daysLeft} days. Use them before they expire!`,
    data: { screen: 'wallet' },
    channels: ['push'],
  });
}

export async function notifyNoShow(userId: string, params: {
  vendorName: string;
  creditsForfeited: number;
}) {
  return sendNotification({
    userId,
    type: 'no_show',
    title: 'Reservation No-Show',
    body: `You missed your reservation at ${params.vendorName}. ${params.creditsForfeited} credits have been forfeited.`,
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
    title: 'Check-in Bonus!',
    body: `Thanks for showing up at ${params.vendorName}! ${params.totalRefunded} credits refunded (includes ${params.bonusCredits} bonus).`,
    data: { screen: 'wallet' },
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
