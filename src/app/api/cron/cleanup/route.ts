import { NextRequest } from 'next/server';
import { cleanupExpiredTokens } from '@/services/token.service';
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

    const tokensCleared = await cleanupExpiredTokens();

    return successResponse({
      message: 'Cleanup cron job completed',
      timestamp: new Date().toISOString(),
      tokensCleared,
    });
  } catch (error) {
    console.error('Cleanup cron job error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Cron job failed',
      500
    );
  }
}
