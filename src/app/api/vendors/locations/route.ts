import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { cache } from '@/lib/cache/cache-service';

const CACHE_KEY = 'vendor:locations';
const CACHE_TTL = 300; // 5 minutes — supply changes slowly

interface CityCount { city: string; count: number }
interface CountryGroup { country: string; vendorCount: number; cities: CityCount[] }

/**
 * GET /api/vendors/locations
 *
 * Returns the countries + cities that actually have bookable (approved, active)
 * venues, with venue counts. The mobile location picker is driven from this so
 * diners never select an empty city.
 */
export const GET = withRateLimit(
  withErrorHandler(async (_request: NextRequest) => {
    const cached = await cache.get<{ countries: CountryGroup[] }>(CACHE_KEY);
    if (cached) return successResponse(cached);

    // One venue == one active main-ish branch. Group active branches of approved
    // vendors by (country, city).
    const rows = await db.vendorBranch.groupBy({
      by: ['country', 'city'],
      where: {
        deletedAt: null,
        isActive: true,
        vendor: { deletedAt: null, verificationStatus: 'approved' },
      },
      _count: { _all: true },
    });

    const byCountry = new Map<string, CountryGroup>();
    for (const r of rows) {
      const country = r.country || 'Nigeria';
      if (!byCountry.has(country)) {
        byCountry.set(country, { country, vendorCount: 0, cities: [] });
      }
      const group = byCountry.get(country)!;
      group.cities.push({ city: r.city, count: r._count._all });
      group.vendorCount += r._count._all;
    }

    const countries = Array.from(byCountry.values())
      .map((g) => ({
        ...g,
        cities: g.cities.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
      }))
      .sort((a, b) => b.vendorCount - a.vendorCount || a.country.localeCompare(b.country));

    const payload = { countries };
    await cache.set(CACHE_KEY, payload, CACHE_TTL);
    return successResponse(payload);
  }),
  apiLimiter
);
