import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache/cache-service';
import { successResponse } from '@/lib/utils/api-response';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { authenticateRequest } from '@/lib/auth/middleware';

/**
 * POST /api/featured/[id]/click
 *
 * Records a click on a featured spot (guest taps it in a carousel). Public,
 * rate-limited, best-effort — always 200 so tracking never blocks navigation.
 * Deduped per (viewer, spot) for a short window so an accidental double-tap or
 * retry isn't double-counted. Pairs with viewable impressions for a fair CTR.
 */
export const POST = withRateLimit(
  async (request: NextRequest, ctx: { params: { id: string } }) => {
    const id = ctx.params.id;
    let viewerId: string | undefined;
    try { viewerId = (await request.json())?.viewerId; } catch { /* no body */ }

    const auth = await authenticateRequest(request).catch(() => null);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || 'anon';
    const viewer = auth?.sub || viewerId || ip;

    const key = `fclk:${viewer}:${id}`;
    const seen = await cache.get<number>(key);
    if (!seen) {
      await cache.set(key, 1, 60); // 60s double-tap guard
      await db.featuredSpot
        .updateMany({ where: { id }, data: { clicks: { increment: 1 } } })
        .catch(() => {});
    }
    return successResponse({ ok: true });
  },
  apiLimiter
);
