import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { paginationSchema } from '@/lib/validators/common';
import { paginatedResponse, getPrismaSkipTake } from '@/lib/utils/pagination';
import { vendorCache } from '@/lib/cache';

// ── Haversine distance (km) ────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Open-now check ──────────────────────────────────────────────────────────
// Evaluated in the venue's local time. These launch markets don't observe DST,
// so a fixed UTC offset per country is accurate.
const COUNTRY_UTC_OFFSET: Record<string, number> = { nigeria: 1, ghana: 0, kenya: 3 };

function isOpenNow(operatingHours: unknown, country?: string | null): boolean {
  if (!Array.isArray(operatingHours)) return false;
  const offset = COUNTRY_UTC_OFFSET[(country || 'nigeria').toLowerCase()] ?? 1;

  // Current wall-clock in the venue's timezone, derived from UTC + offset.
  const now = new Date();
  let mins = now.getUTCHours() * 60 + now.getUTCMinutes() + offset * 60;
  let day  = now.getUTCDay(); // 0 = Sunday
  if (mins >= 1440) { mins -= 1440; day = (day + 1) % 7; }
  if (mins < 0)     { mins += 1440; day = (day + 6) % 7; }

  const entry = (operatingHours as Array<any>).find((h) => h && h.dayOfWeek === day);
  if (!entry || entry.isClosed) return false;

  const toMins = (t: string) => {
    const [h, m] = String(t).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const open = toMins(entry.openTime);
  let close = toMins(entry.closeTime);
  if (close === 0) close = 1440;          // '00:00' close means midnight
  if (close <= open) return mins >= open || mins < close; // spans midnight
  return mins >= open && mins < close;
}

// ── Cache key ─────────────────────────────────────────────────────────────
function getCacheKey(params: Record<string, string | null>): string {
  const sorted = Object.entries(params)
    .filter(([_, v]) => v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return sorted || 'default';
}

export const GET = withRateLimit(
  withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const { page, limit } = paginationSchema.parse(Object.fromEntries(searchParams));

    const search    = searchParams.get('search');
    const city      = searchParams.get('city');
    const country   = searchParams.get('country');
    const cuisine   = searchParams.get('cuisine') || searchParams.get('cuisineType');
    const minRating = searchParams.get('minRating');
    const featured  = searchParams.get('featured') === 'true';
    // venueType filter: maps to VenueType enum (fine_dining | upscale_casual | lounge | casual)
    const venueType = searchParams.get('venueType');
    // businessType filter: bars, cafes, etc.
    const businessType = searchParams.get('businessType');
    // priceLevel filter: multi-select, e.g. "1,2" → ₦ or ₦₦ venues (1–4)
    const priceLevels = (searchParams.get('priceLevel') || '')
      .split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 4);
    const hasExperiences = searchParams.get('hasExperiences') === 'true';
    const openNow        = searchParams.get('openNow') === 'true';

    // Distance params — when provided, skip the DB cache and sort by proximity
    const userLat  = searchParams.get('lat')      ? parseFloat(searchParams.get('lat')!)    : null;
    const userLng  = searchParams.get('lng')      ? parseFloat(searchParams.get('lng')!)    : null;
    const radiusKm = searchParams.get('radiusKm') ? parseFloat(searchParams.get('radiusKm')!) : null;
    const sortBy   = searchParams.get('sort');     // 'distance' | 'rating' | 'price_low' | 'price_high' | undefined
    const nearMode = userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng);
    // jsMode = fetch all matching, then filter/sort + paginate in JS.
    // Distance (proximity) and open-now both need row-level JS evaluation.
    const jsMode = nearMode || openNow;

    const { skip, take } = getPrismaSkipTake(page, limit);

    // Cache key — must capture every parameter that changes the result set
    const cacheKey = getCacheKey({
      page: String(page), limit: String(limit), search, city, country, cuisine, minRating,
      venueType, businessType, sort: sortBy,
      priceLevel: priceLevels.length ? priceLevels.join(',') : null,
      hasExperiences: hasExperiences ? 'true' : null,
      featured: featured ? 'true' : null,
    });
    // Only cache deterministic queries — distance/open-now depend on caller location/time
    if (!jsMode) {
      const cached = await vendorCache.getList(cacheKey) as { items: any[]; page: number; limit: number; total: number } | null;
      if (cached) {
        return paginatedResponse(cached.items, cached.page, cached.limit, cached.total);
      }
    }

    // ── Build Prisma where ────────────────────────────────────────────────
    const where: Record<string, unknown> = {
      deletedAt: null,
      verificationStatus: 'approved',
    };

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description:  { contains: search, mode: 'insensitive' } },
        { cuisineTypes: { hasSome: [search, searchLower, search.charAt(0).toUpperCase() + search.slice(1).toLowerCase()] } },
      ];
    }

    if (cuisine) {
      const cuisineLower = cuisine.toLowerCase();
      const cuisineCap   = cuisine.charAt(0).toUpperCase() + cuisine.slice(1).toLowerCase();
      where.cuisineTypes = { hasSome: [cuisine, cuisineLower, cuisineCap] };
    }

    if (minRating) {
      where.averageRating = { gte: parseFloat(minRating) };
    }

    if (featured) {
      where.isFeatured = true;
      where.OR = [{ featuredUntil: null }, { featuredUntil: { gte: new Date() } }];
    }

    if (venueType) {
      where.venueType = venueType;
    }

    if (businessType) {
      where.businessType = businessType;
    }

    if (priceLevels.length) {
      where.priceLevel = { in: priceLevels };
    }

    if (hasExperiences) {
      where.experiences = { some: { isActive: true } };
    }

    const branchWhere: Record<string, unknown> = { deletedAt: null, isActive: true };
    if (city)    branchWhere.city    = { contains: city, mode: 'insensitive' };
    if (country) branchWhere.country = { equals: country, mode: 'insensitive' };

    const vendorWhere = (city || country)
      ? { ...where, branches: { some: branchWhere } }
      : where;

    // ── Query ─────────────────────────────────────────────────────────────
    // For near-me queries we need ALL matching vendors so we can filter/sort by distance,
    // then paginate in JS. For regular queries we push skip/take to the DB.
    const dbSkip = jsMode ? 0   : skip;
    const dbTake = jsMode ? 500 : take; // cap at 500 for JS-sorted modes to avoid OOM

    const [vendors, dbTotal] = await Promise.all([
      db.vendor.findMany({
        where: vendorWhere,
        select: {
          id: true,
          businessName: true,
          slug: true,
          logo: true,
          description: true,
          cuisineTypes: true,
          venueType: true,
          priceLevel: true,
          businessType: true,
          averageRating: true,
          totalReviews: true,
          subscriptionTier: true,
          verificationStatus: true,
          isFeatured: true,
          reliabilityScore: true,
          bookWithConfidence: true,
          branches: {
            where: { ...branchWhere, isMainBranch: true },
            select: { id: true, name: true, address: true, city: true, state: true, country: true, latitude: true, longitude: true, operatingHours: true },
            take: 1,
          },
          galleryImages: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true },
          },
        },
        // Ranking precedence (subscriptionTier enum is basic<pro<elite, so 'desc'
        // = elite > pro > basic). Premium tiers rank ahead of basic on every
        // sort; on the default sort, active featured (paid placement) leads, then
        // tier, then quality. Explicit sorts keep their primary key, with tier as
        // the tiebreaker so premium edges out basic at equal rating/price.
        orderBy:
          sortBy === 'rating'     ? [{ averageRating: 'desc' }, { subscriptionTier: 'desc' }, { totalReviews: 'desc' }]
          : sortBy === 'price_low'  ? [{ priceLevel: 'asc' },  { subscriptionTier: 'desc' }, { averageRating: 'desc' }]
          : sortBy === 'price_high' ? [{ priceLevel: 'desc' }, { subscriptionTier: 'desc' }, { averageRating: 'desc' }]
          : jsMode
            ? [{ subscriptionTier: 'desc' }, { averageRating: 'desc' }]  // secondary; primary (distance) applied in JS
            : [{ isFeatured: 'desc' }, { subscriptionTier: 'desc' }, { averageRating: 'desc' }, { totalReviews: 'desc' }],
        skip: dbSkip,
        take: dbTake,
      }),
      db.vendor.count({ where: vendorWhere }),
    ]);

    // ── Format ────────────────────────────────────────────────────────────
    let formattedVendors = vendors.map((v: any) => ({
      id: v.id,
      businessName: v.businessName,
      slug: v.slug,
      description: v.description,
      cuisineTypes: v.cuisineTypes,
      venueType: v.venueType,
      priceLevel: v.priceLevel ?? null,
      businessType: v.businessType,
      averageRating: v.averageRating,
      totalReviews: v.totalReviews,
      subscriptionTier: v.subscriptionTier,
      verificationStatus: v.verificationStatus,
      isVerified: v.verificationStatus === 'approved',
      isFeatured: v.isFeatured || false,
      bookWithConfidence: v.bookWithConfidence || false,
      reliabilityScore: v.reliabilityScore ?? null,
      mainBranch: v.branches?.[0] || null,
      logo: v.logo || null,
      coverImage: v.galleryImages?.[0]?.url || null,
      distanceKm: null as number | null,
    }));

    // ── Open-now + distance filter/sort, then paginate in JS ───────────────
    let total = dbTotal;
    if (jsMode) {
      if (openNow) {
        formattedVendors = formattedVendors.filter((v) =>
          isOpenNow(v.mainBranch?.operatingHours, v.mainBranch?.country));
      }

      if (nearMode) {
        // Attach distance to each vendor (using main branch lat/lng)
        formattedVendors = formattedVendors
          .map((v) => {
            const b = v.mainBranch;
            if (b?.latitude != null && b?.longitude != null) {
              v.distanceKm = haversineKm(userLat!, userLng!, b.latitude, b.longitude);
            }
            return v;
          })
          // Filter by radius when provided
          .filter((v) => {
            if (radiusKm && v.distanceKm !== null) return v.distanceKm <= radiusKm;
            return true; // no radius limit — return all with coordinates
          });
      }

      total = formattedVendors.length;

      if (sortBy === 'distance') {
        // elite > pro > basic — used only to break near-ties (within ~50m).
        const tierRank: Record<string, number> = { elite: 3, pro: 2, basic: 1 };
        formattedVendors.sort((a, b) => {
          const da = a.distanceKm ?? Infinity;
          const db_ = b.distanceKm ?? Infinity;
          if (Math.abs(da - db_) > 0.05) return da - db_; // >50m apart → nearest wins
          return (tierRank[b.subscriptionTier] ?? 0) - (tierRank[a.subscriptionTier] ?? 0);
        });
      }

      // Paginate in JS
      formattedVendors = formattedVendors.slice(skip, skip + take);
    } else {
      // Cache deterministic results under the same key built above
      await vendorCache.setList(cacheKey, { items: formattedVendors, page, limit, total });
    }

    return paginatedResponse(formattedVendors, page, limit, total);
  }),
  apiLimiter
);
