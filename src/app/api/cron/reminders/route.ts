import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { captureException } from '@/lib/monitoring/capture';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { sendReservationReminderEmail } from '@/services/email.service';
import { notifyReservationReminder } from '@/services/notification.service';
import { resolvePreferences } from '@/lib/notifications/preferences';

/**
 * Reservation Reminder Cron Job
 * 
 * Sends SMS + email reminders for reservations happening tomorrow.
 * 
 * Vercel Cron:
 * { "path": "/api/cron/reminders", "schedule": "0 9 * * *" }
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    // Find reservations happening tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const upcomingReservations = await db.reservation.findMany({
      where: {
        date: { gte: startOfDay, lt: endOfDay },
        status: 'confirmed',
      },
      include: {
        user: { select: { id: true, phone: true, email: true, name: true, notificationPreferences: true } },
        vendor: { select: { businessName: true } },
      },
    });

    let pushSmsSent = 0;
    let emailSent = 0;
    let skipped = 0;

    for (const reservation of upcomingReservations) {
      const vendorName = reservation.vendor?.businessName || 'Restaurant';

      // Respect the user's "reminders" preference — a disabled toggle means no reminder.
      const prefs = resolvePreferences(reservation.user.notificationPreferences);
      if (!prefs.reminders) {
        skipped++;
        continue;
      }

      // Push + SMS reminder (preference re-checked inside, multi-channel + persisted).
      try {
        await notifyReservationReminder(reservation.user.id, {
          vendorName,
          time: reservation.time,
          reference: reservation.reference,
        });
        pushSmsSent++;
      } catch (err) {
        console.error(`Push/SMS reminder failed for reservation ${reservation.id}:`, err);
      }

      // Email reminder (proper reminder template, not the confirmation template).
      if (reservation.user.email) {
        try {
          await sendReservationReminderEmail({
            to: reservation.user.email,
            userName: reservation.user.name || 'Guest',
            vendorName,
            date: reservation.date.toISOString().split('T')[0],
            time: reservation.time,
            partySize: reservation.partySize,
            reference: reservation.reference,
            pin: reservation.pin || '',
            qrCodeUrl: reservation.qrCode || '',
          });
          emailSent++;
        } catch (err) {
          console.error(`Email reminder failed for reservation ${reservation.id}:`, err);
        }
      }
    }

    return successResponse({
      message: 'Reminder cron job completed',
      timestamp: new Date().toISOString(),
      reservationsFound: upcomingReservations.length,
      pushSmsSent,
      emailSent,
      skippedByPreference: skipped,
    });
  } catch (error) {
    captureException(error, { scope: 'cron:reminders' });
    return errorResponse(
      error instanceof Error ? error.message : 'Cron job failed',
      500
    );
  }
}
