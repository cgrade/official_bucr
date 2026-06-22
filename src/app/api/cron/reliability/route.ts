import { NextRequest } from 'next/server';
import { computeReliabilityScores } from '@/services/reliability.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * Reliability Score + Badge Cron
 * Runs daily and recomputes every approved vendor's reliability score and
 * Book-With-Confidence badge over the last 90 days.
 *
 * Vercel Cron: { "path": "/api/cron/reliability", "schedule": "0 3 * * *" }
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    const result = await computeReliabilityScores();

    return successResponse({
      message: 'Reliability score cron completed',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Reliability cron error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Cron failed', 500);
  }
}
