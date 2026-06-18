import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, notFoundResponse, errorResponse } from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { paginationSchema } from '@/lib/validators/common';
import { getPrismaSkipTake } from '@/lib/utils/pagination';

// GET /api/vendors/[slug]/reviews - Get reviews for a vendor
export const GET = withRateLimit(
  withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const { page, limit } = paginationSchema.parse(Object.fromEntries(searchParams));
    const { skip, take } = getPrismaSkipTake(page, limit);

    // Find vendor by slug
    const vendor = await db.vendor.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, averageRating: true, totalReviews: true },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: {
          vendorId: vendor.id,
          isVisible: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          reservation: {
            select: {
              date: true,
              partySize: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      db.review.count({
        where: {
          vendorId: vendor.id,
          isVisible: true,
        },
      }),
    ]);

    const formattedReviews = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,
      vendorResponse: r.vendorResponse,
      respondedAt: r.respondedAt,
      user: {
        id: r.user.id,
        name: r.user.name,
        avatar: r.user.avatar,
      },
      reservation: r.reservation ? {
        date: r.reservation.date,
        partySize: r.reservation.partySize,
      } : null,
    }));

    return successResponse({
      reviews: formattedReviews,
      averageRating: vendor.averageRating,
      total: vendor.totalReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }),
  apiLimiter
);
