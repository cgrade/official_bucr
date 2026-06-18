import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const rating = searchParams.get('rating');
    const responded = searchParams.get('responded');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { vendorId: vendor.id };

    if (rating) {
      where.rating = parseInt(rating);
    }

    if (responded === 'true') {
      where.vendorResponse = { not: null };
    } else if (responded === 'false') {
      where.vendorResponse = null;
    }

    const [reviews, total, stats] = await Promise.all([
      db.review.findMany({
        where,
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
              id: true,
              reference: true,
              date: true,
            },
          },
          order: {
            select: {
              id: true,
              reference: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.review.count({ where }),
      db.review.groupBy({
        by: ['rating'],
        where: { vendorId: vendor.id },
        _count: true,
      }),
    ]);

    // Format rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    stats.forEach((s) => {
      ratingDistribution[s.rating as keyof typeof ratingDistribution] = s._count;
    });

    return successResponse(
      {
        reviews,
        stats: {
          averageRating: vendor.averageRating,
          totalReviews: vendor.totalReviews,
          ratingDistribution,
        },
      },
      undefined,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get vendor reviews error:', error);
    return errorResponse('Failed to get reviews', 500);
  }
}
