import { NextRequest } from 'next/server';
import { checkExpiredSubscriptions } from '@/services/subscription.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * Subscription Expiry Cron Job Endpoint
 * 
 * Should be called daily to downgrade vendors with expired subscriptions.
 * 
 * Vercel Cron:
 * { "path": "/api/cron/subscriptions", "schedule": "0 1 * * *" }
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    const result = await checkExpiredSubscriptions();

    return successResponse({
      message: 'Subscription cron job completed',
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('Subscription cron job error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Cron job failed',
      500
    );
  }
}
