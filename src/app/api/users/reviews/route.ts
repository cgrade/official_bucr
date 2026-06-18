import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';
import { paginationSchema } from '@/lib/validators/common';

export const GET = withRateLimit(
  withErrorHandler(async (request: NextRequest) => {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = paginationSchema.parse(Object.fromEntries(searchParams));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: {
          userId: payload.sub,
          isVisible: true,
        },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          reservation: {
            select: {
              id: true,
              date: true,
              reference: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.review.count({
        where: {
          userId: payload.sub,
          isVisible: true,
        },
      }),
    ]);

    return successResponse({
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        vendorResponse: review.vendorResponse,
        createdAt: review.createdAt,
        vendor: review.vendor,
        reservation: review.reservation,
      })),
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
