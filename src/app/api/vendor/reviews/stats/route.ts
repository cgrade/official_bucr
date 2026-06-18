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

// GET /api/vendor/reviews/stats - Get review statistics for vendor
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

    // Get review statistics
    const reviews = await db.review.findMany({
      where: { vendorId: vendor.id, isVisible: true },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    // Count by rating
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    // Get recent reviews count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviewsCount = await db.review.count({
      where: {
        vendorId: vendor.id,
        isVisible: true,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Get pending responses count
    const pendingResponsesCount = await db.review.count({
      where: {
        vendorId: vendor.id,
        isVisible: true,
        vendorResponse: null,
      },
    });

    return successResponse({
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      recentReviewsCount,
      pendingResponsesCount,
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    return errorResponse('Failed to get review statistics', 500);
  }
}
