import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { captureException } from '@/lib/monitoring/capture';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { sendVendorWeeklyReport } from '@/services/email.service';
import { resolveVendorPreferences } from '@/lib/notifications/preferences';

/**
 * Weekly Vendor Report Cron
 *
 * Emails each active vendor's owner a summary of the last 7 days, gated by the
 * vendor's 'weeklyReports' notification preference.
 *
 * Vercel Cron: { "path": "/api/cron/weekly-reports", "schedule": "0 8 * * 1" } (Mon 08:00)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodLabel = `${weekAgo.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}–${now.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`;

    const vendors = await db.vendor.findMany({
      where: { deletedAt: null, verificationStatus: 'approved' },
      select: {
        id: true,
        businessName: true,
        email: true,
        averageRating: true,
        notificationPreferences: true,
        ownerId: true,
      },
    });

    // Owner contact emails (no Prisma relation exists, so fetch by ownerId).
    const ownerIds = vendors.map((v) => v.ownerId).filter(Boolean);
    const owners = await db.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, email: true },
    });
    const ownerEmailById = new Map(owners.map((o) => [o.id, o.email]));

    let sent = 0;
    let skipped = 0;

    for (const vendor of vendors) {
      const prefs = resolveVendorPreferences(vendor.notificationPreferences);
      const to = ownerEmailById.get(vendor.ownerId) || vendor.email;
      if (!prefs.weeklyReports || !to) {
        skipped++;
        continue;
      }

      const [reservations, checkIns, noShows, orders, newReviews] = await Promise.all([
        db.reservation.count({ where: { vendorId: vendor.id, createdAt: { gte: weekAgo } } }),
        db.reservation.count({ where: { vendorId: vendor.id, status: 'checked_in', updatedAt: { gte: weekAgo } } }),
        db.reservation.count({ where: { vendorId: vendor.id, status: 'no_show', updatedAt: { gte: weekAgo } } }),
        db.takeoutOrder.count({ where: { vendorId: vendor.id, createdAt: { gte: weekAgo } } }),
        db.review.count({ where: { vendorId: vendor.id, createdAt: { gte: weekAgo } } }),
      ]);

      try {
        await sendVendorWeeklyReport({
          to,
          vendorName: vendor.businessName,
          periodLabel,
          reservations,
          checkIns,
          noShows,
          orders,
          newReviews,
          averageRating: vendor.averageRating,
        });
        sent++;
      } catch (err) {
        console.error(`Weekly report failed for vendor ${vendor.id}:`, err);
      }
    }

    return successResponse({
      message: 'Weekly report cron completed',
      timestamp: now.toISOString(),
      vendorsConsidered: vendors.length,
      sent,
      skipped,
    });
  } catch (error) {
    captureException(error, { scope: 'cron:weekly-reports' });
    return errorResponse(error instanceof Error ? error.message : 'Cron job failed', 500);
  }
}
