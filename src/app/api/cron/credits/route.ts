import { NextRequest } from 'next/server';
import { captureException } from '@/lib/monitoring/capture';
import { processExpiredCredits, sendExpiryReminders } from '@/services/credit.service';
import { processExpiredGifts } from '@/services/gift.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * Credit Expiry Cron Job Endpoint
 * 
 * This endpoint should be called by a cron job (e.g., daily at midnight)
 * to process expired credits and send expiry reminders.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/credits",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    const action = request.nextUrl.searchParams.get('action') || 'all';

    const results: {
      expiry?: Awaited<ReturnType<typeof processExpiredCredits>>;
      reminders?: Awaited<ReturnType<typeof sendExpiryReminders>>;
      gifts?: Awaited<ReturnType<typeof processExpiredGifts>>;
    } = {};

    if (action === 'all' || action === 'expiry') {
      results.expiry = await processExpiredCredits();
    }

    if (action === 'all' || action === 'reminders') {
      results.reminders = await sendExpiryReminders();
    }

    // Expire unclaimed gifts and refund senders
    if (action === 'all' || action === 'gifts') {
      results.gifts = await processExpiredGifts();
    }

    return successResponse({
      message: 'Credit cron job completed',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    captureException(error, { scope: 'cron:credits' });
    return errorResponse(
      error instanceof Error ? error.message : 'Cron job failed',
      500
    );
  }
}
