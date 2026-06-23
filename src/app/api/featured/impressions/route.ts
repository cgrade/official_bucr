import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache/cache-service';
import { ECONOMICS } from '@/lib/config/economics';
import { successResponse, validationErrorResponse } from '@/lib/utils/api-response';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { authenticateRequest } from '@/lib/auth/middleware';

const schema = z.object({
  // Spot ids that became genuinely viewable (≥50% on-screen for ≥1s) on the client.
  spotIds: z.array(z.string()).min(1).max(20),
  // Stable anonymous device id; ignored if the request is authenticated.
  viewerId: z.string().min(8).max(64).optional(),
});

/**
 * POST /api/featured/impressions
 *
 * Records VIEWABLE, DEDUPLICATED featured impressions — the MRC/IAB standard.
 * The client only sends spots that were actually viewable (≥50% for ≥1s), and we
 * dedup per (viewer, spot) within a rolling window so the same person scrolling
 * back or reopening the app doesn't inflate the count. Best-effort: always 200.
 */
export const POST = withRateLimit(
  async (request: NextRequest) => {
    let body: unknown;
    try { body = await request.json(); } catch { return successResponse({ counted: 0 }); }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
    }

    // Viewer identity for dedup: authenticated user > device id > IP (GIVT-lite).
    const auth = await authenticateRequest(request).catch(() => null);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || 'anon';
    const viewer = auth?.sub || parsed.data.viewerId || ip;

    const windowSecs = ECONOMICS.FEATURED_IMPRESSION_DEDUP_MINUTES * 60;
    const uniqueIds = Array.from(new Set(parsed.data.spotIds));

    // Keep only spots this viewer hasn't been counted for within the window.
    const fresh: string[] = [];
    for (const id of uniqueIds) {
      const key = `fimp:${viewer}:${id}`;
      const seen = await cache.get<number>(key);
      if (!seen) {
        await cache.set(key, 1, windowSecs);
        fresh.push(id);
      }
    }

    if (fresh.length) {
      await db.featuredSpot
        .updateMany({ where: { id: { in: fresh } }, data: { impressions: { increment: 1 } } })
        .catch((err) => console.error('[featured] impression increment failed:', err));
    }

    return successResponse({ counted: fresh.length });
  },
  apiLimiter
);
