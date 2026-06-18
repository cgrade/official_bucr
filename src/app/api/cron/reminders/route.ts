import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { sendReservationReminder } from '@/services/sms.service';
import { sendReservationConfirmation } from '@/services/email.service';

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
        user: { select: { phone: true, email: true, name: true } },
        vendor: { select: { businessName: true } },
      },
    });

    let smsSent = 0;
    let emailSent = 0;

    for (const reservation of upcomingReservations) {
      const vendorName = reservation.vendor?.businessName || 'Restaurant';

      // Send SMS reminder
      if (reservation.user.phone) {
        try {
          await sendReservationReminder({
            to: reservation.user.phone,
            vendorName,
            date: reservation.date.toISOString().split('T')[0],
            time: reservation.time,
            reference: reservation.reference,
          });
          smsSent++;
        } catch (err) {
          console.error(`SMS reminder failed for reservation ${reservation.id}:`, err);
        }
      }

      // Send email reminder
      if (reservation.user.email) {
        try {
          await sendReservationConfirmation({
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
      smsSent,
      emailSent,
    });
  } catch (error) {
    console.error('Reminder cron job error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Cron job failed',
      500
    );
  }
}
