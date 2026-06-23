import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/utils/api-response';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';

/**
 * POST /api/featured/[id]/click
 *
 * Records a click on a featured spot (guest taps it in a carousel). Public and
 * best-effort — always returns 200 so a tracking hiccup never blocks the user's
 * navigation. Pairs with the impression count recorded in GET /api/featured to
 * give vendors a CTR for their ad ROI.
 */
export const POST = withRateLimit(
  async (_request: NextRequest, ctx: { params: { id: string } }) => {
    await db.featuredSpot
      .updateMany({ where: { id: ctx.params.id }, data: { clicks: { increment: 1 } } })
      .catch(() => {});
    return successResponse({ ok: true });
  },
  apiLimiter
);
