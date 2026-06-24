import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import type { NextRequest } from 'next/server';

const DEFAULTS = ['Under ₦10,000', '₦10,000 – ₦20,000', '₦20,000 – ₦40,000', '₦40,000+'];

/**
 * GET /api/config/price-ranges — public. The admin-defined spend-per-person label
 * for each price level (1–4), shown to diners in search filters/sort.
 */
export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, 'api');
  if (limited) return limited;
  try {
    const rows = await db.systemSetting.findMany({ where: { key: { in: ['priceRange1', 'priceRange2', 'priceRange3', 'priceRange4'] } } });
    const map: Record<string, string> = {};
    for (const r of rows) {
      try { map[r.key] = JSON.parse(r.value); } catch { map[r.key] = r.value; }
    }
    const ranges = [1, 2, 3, 4].map((i) => ({
      level: i,
      symbol: '₦'.repeat(i),
      label: map[`priceRange${i}`] || DEFAULTS[i - 1],
    }));
    return successResponse({ ranges });
  } catch (error) {
    console.error('[/api/config/price-ranges]', error);
    return errorResponse('Failed to load price ranges', 500);
  }
}
