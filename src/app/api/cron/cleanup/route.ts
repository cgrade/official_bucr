import { NextRequest } from 'next/server';
import { cleanupExpiredTokens } from '@/services/token.service';
import { processFeaturedAutoRenewals } from '@/services/featured.service';
import { expireStaleWaitlist } from '@/services/waitlist.service';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * Cleanup Cron Job Endpoint
 * 
 * Cleans up expired verification tokens from the database.
 * 
 * Vercel Cron:
 * { "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    const now = new Date();

    // Renew opted-in featured spots before resetting expired flags below.
    const featuredAutoRenew = await processFeaturedAutoRenewals();

    const [tokensCleared, menuItemsRestored, featuredExpired, waitlistExpired] = await Promise.all([
      cleanupExpiredTokens(),
      // Clear expired "86" windows so items show as available again
      (db.menu as any).updateMany({
        where: { unavailableUntil: { lte: now } },
        data: { unavailableUntil: null },
      }).then((r: { count: number }) => r.count),
      // Reset expired featured flags so search ranking + badges stay accurate
      db.vendor.updateMany({
        where: { isFeatured: true, featuredUntil: { not: null, lte: now } },
        data: { isFeatured: false, featuredUntil: null, featuredAt: null },
      }).then((r) => r.count),
      // Expire waitlist holds that lapsed without the guest claiming
      expireStaleWaitlist(),
    ]);

    return successResponse({
      message: 'Cleanup cron job completed',
      timestamp: new Date().toISOString(),
      tokensCleared,
      menuItemsRestored,
      featuredExpired,
      waitlistExpired,
      featuredAutoRenew,
    });
  } catch (error) {
    console.error('Cleanup cron job error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Cron job failed',
      500
    );
  }
}
