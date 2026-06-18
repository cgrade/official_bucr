import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { paginationSchema } from '@/lib/validators/common';
import { paginatedResponse, getPrismaSkipTake } from '@/lib/utils/pagination';
import { vendorCache } from '@/lib/cache';

// Generate cache key from query params
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
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const cuisine = searchParams.get('cuisine') || searchParams.get('cuisineType');
    const minRating = searchParams.get('minRating');
    const featured = searchParams.get('featured') === 'true';
    const { skip, take } = getPrismaSkipTake(page, limit);

    // Check cache first
    const cacheKey = getCacheKey({ page: String(page), limit: String(limit), search, city, cuisine, minRating, featured: featured ? 'true' : null });
    const cached = await vendorCache.getList(cacheKey) as { items: any[]; page: number; limit: number; total: number } | null;
    if (cached) {
      return paginatedResponse(cached.items, cached.page, cached.limit, cached.total);
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
      verificationStatus: 'approved',
    };

    if (search) {
      // Search in business name, description, and cuisines (case-insensitive)
      const searchLower = search.toLowerCase();
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        // Match cuisines containing the search term
        { cuisineTypes: { hasSome: [search, searchLower, search.charAt(0).toUpperCase() + search.slice(1).toLowerCase()] } },
      ];
    }

    if (cuisine) {
      // Match cuisines case-insensitively
      const cuisineLower = cuisine.toLowerCase();
      const cuisineCapitalized = cuisine.charAt(0).toUpperCase() + cuisine.slice(1).toLowerCase();
      where.cuisineTypes = { hasSome: [cuisine, cuisineLower, cuisineCapitalized] };
    }

    if (minRating) {
      where.averageRating = { gte: parseFloat(minRating) };
    }

    if (featured) {
      where.isFeatured = true;
      where.OR = [
        { featuredUntil: null },
        { featuredUntil: { gte: new Date() } },
      ];
    }

    // Filter by city through branches (only if city is specified)
    const branchWhere: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
    };

    if (city) {
      branchWhere.city = { contains: city, mode: 'insensitive' };
    }

    // Build the vendor where clause - only require branch match if city is specified
    const vendorWhere = city 
      ? { ...where, branches: { some: branchWhere } }
      : where;

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where: vendorWhere,
        select: {
          id: true,
          businessName: true,
          slug: true,
          logo: true,
          description: true,
          cuisineTypes: true,
          averageRating: true,
          totalReviews: true,
          subscriptionTier: true,
          verificationStatus: true,
          isFeatured: true,
          branches: {
            where: { ...branchWhere, isMainBranch: true },
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
            },
            take: 1,
          },
          galleryImages: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true },
          },
        },
        orderBy: [
          { subscriptionTier: 'desc' },
          { averageRating: 'desc' },
          { totalReviews: 'desc' },
        ],
        skip,
        take,
      }),
      db.vendor.count({
        where: vendorWhere,
      }),
    ]);

    const formattedVendors = vendors.map((v: any) => ({
      id: v.id,
      businessName: v.businessName,
      slug: v.slug,
      description: v.description,
      cuisineTypes: v.cuisineTypes,
      averageRating: v.averageRating,
      totalReviews: v.totalReviews,
      isPremium: v.subscriptionTier === 'premium',
      isVerified: v.verificationStatus === 'approved',
      isFeatured: v.isFeatured || false,
      mainBranch: v.branches?.[0] || null,
      logo: v.logo || null,
      coverImage: v.galleryImages?.[0]?.url || null,
    }));

    // Cache the result for future requests
    await vendorCache.setList(cacheKey, { items: formattedVendors, page, limit, total });

    return paginatedResponse(formattedVendors, page, limit, total);
  }),
  apiLimiter
);
