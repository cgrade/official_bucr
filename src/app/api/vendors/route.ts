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
    const cuisine   = searchParams.get('cuisine') || searchParams.get('cuisineType');
    const minRating = searchParams.get('minRating');
    const featured  = searchParams.get('featured') === 'true';
    // venueType filter: maps to VenueType enum (fine_dining | upscale_casual | lounge | casual)
    const venueType = searchParams.get('venueType');
    // businessType filter: bars, cafes, etc.
    const businessType = searchParams.get('businessType');

    // Distance params — when provided, skip the DB cache and sort by proximity
    const userLat  = searchParams.get('lat')      ? parseFloat(searchParams.get('lat')!)    : null;
    const userLng  = searchParams.get('lng')      ? parseFloat(searchParams.get('lng')!)    : null;
    const radiusKm = searchParams.get('radiusKm') ? parseFloat(searchParams.get('radiusKm')!) : null;
    const sortBy   = searchParams.get('sort');     // 'distance' | undefined
    const nearMode = userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng);

    const { skip, take } = getPrismaSkipTake(page, limit);

    // Only use cache when NOT doing distance-based queries (results are location-specific)
    if (!nearMode) {
      const cacheKey = getCacheKey({ page: String(page), limit: String(limit), search, city, cuisine, minRating, venueType, businessType, featured: featured ? 'true' : null });
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

    const branchWhere: Record<string, unknown> = { deletedAt: null, isActive: true };
    if (city) branchWhere.city = { contains: city, mode: 'insensitive' };

    const vendorWhere = city ? { ...where, branches: { some: branchWhere } } : where;

    // ── Query ─────────────────────────────────────────────────────────────
    // For near-me queries we need ALL matching vendors so we can filter/sort by distance,
    // then paginate in JS. For regular queries we push skip/take to the DB.
    const dbSkip = nearMode ? 0   : skip;
    const dbTake = nearMode ? 500 : take; // cap at 500 for near-me to avoid OOM

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
            select: { id: true, name: true, address: true, city: true, state: true, latitude: true, longitude: true },
            take: 1,
          },
          galleryImages: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true },
          },
        },
        orderBy: nearMode
          ? [{ averageRating: 'desc' }]  // secondary sort; primary is distance below
          : [{ subscriptionTier: 'desc' }, { averageRating: 'desc' }, { totalReviews: 'desc' }],
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

    // ── Distance filter + sort ────────────────────────────────────────────
    let total = dbTotal;
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

      total = formattedVendors.length;

      // Sort by distance if requested
      if (sortBy === 'distance') {
        formattedVendors.sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }

      // Paginate in JS
      formattedVendors = formattedVendors.slice(skip, skip + take);
    } else {
      // Cache non-distance results
      const cacheKey = getCacheKey({ page: String(page), limit: String(limit), search, city, cuisine, minRating, venueType, businessType, featured: featured ? 'true' : null });
      await vendorCache.setList(cacheKey, { items: formattedVendors, page, limit, total });
    }

    return paginatedResponse(formattedVendors, page, limit, total);
  }),
  apiLimiter
);
