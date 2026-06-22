import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { awardBonus } from '@/services/credit.service';
import { syncVendorAchievements } from '@/services/achievement.service';
import { notifyVendorNewReview } from '@/services/notification.service';
import { config } from '@/lib/config';

const createReviewSchema = z.object({
  vendorId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10, 'Review must be at least 10 characters').max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { vendorId, reservationId, orderId, rating, text } = validation.data;

    // Must have either reservationId or orderId
    if (!reservationId && !orderId) {
      return validationErrorResponse(['Either reservationId or orderId is required']);
    }

    // Verify the user has completed a reservation or order (verified review)
    if (reservationId) {
      const reservation = await db.reservation.findFirst({
        where: {
          id: reservationId,
          userId: payload.sub,
          vendorId,
          status: 'checked_in',
        },
      });

      if (!reservation) {
        return errorResponse('You can only review after checking in', 400);
      }

      // Check if already reviewed
      const existingReview = await db.review.findUnique({
        where: { reservationId },
      });

      if (existingReview) {
        return errorResponse('You have already reviewed this reservation', 409);
      }
    }

    if (orderId) {
      const order = await db.takeoutOrder.findFirst({
        where: {
          id: orderId,
          userId: payload.sub,
          vendorId,
          status: 'completed',
        },
      });

      if (!order) {
        return errorResponse('You can only review completed orders', 400);
      }

      // Check if already reviewed
      const existingReview = await db.review.findUnique({
        where: { orderId },
      });

      if (existingReview) {
        return errorResponse('You have already reviewed this order', 409);
      }
    }

    // Calculate bonus credits for review
    const { reviewBonusMin, reviewBonusMax } = config.credits;
    const bonusCredits = Math.floor(
      Math.random() * (reviewBonusMax - reviewBonusMin + 1) + reviewBonusMin
    );

    // Create review and award credits
    const review = await db.$transaction(async (tx) => {
      // Create review
      const newReview = await tx.review.create({
        data: {
          userId: payload.sub,
          vendorId,
          reservationId,
          orderId,
          rating,
          text,
          creditsEarned: bonusCredits,
        },
      });

      // Award bonus credits
      const user = await tx.user.findUnique({
        where: { id: payload.sub },
        select: { creditsBalance: true },
      });

      const newBalance = (user?.creditsBalance || 0) + bonusCredits;

      await tx.creditTransaction.create({
        data: {
          userId: payload.sub,
          type: 'bonus',
          amount: bonusCredits,
          balanceAfter: newBalance,
          referenceType: 'review',
          referenceId: newReview.id,
          description: `Review bonus: ${bonusCredits} credits`,
        },
      });

      await tx.user.update({
        where: { id: payload.sub },
        data: { creditsBalance: newBalance },
      });

      // Update vendor average rating
      const reviews = await tx.review.findMany({
        where: { vendorId, isVisible: true },
        select: { rating: true },
      });

      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviews.length,
        },
      });

      return newReview;
    });

    // Sync achievements fire-and-forget — may unlock "Top Rated" (avg ≥ 4.5 with ≥ 10 reviews)
    syncVendorAchievements(validation.data.vendorId).catch(() => {});

    // Notify the vendor of the new review (gated by vendor 'newReviews' preference).
    db.user
      .findUnique({ where: { id: payload.sub }, select: { name: true } })
      .then((u) =>
        notifyVendorNewReview(vendorId, { guestName: u?.name || 'A guest', rating })
      )
      .catch((err) => console.error('Failed to notify vendor of review:', err));

    return successResponse(
      {
        review,
        creditsEarned: bonusCredits,
      },
      `Thank you for your review! You earned ${bonusCredits} bonus credits.`,
      undefined,
      201
    );
  } catch (error) {
    console.error('Create review error:', error);
    return errorResponse('Failed to create review', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!vendorId) {
      return validationErrorResponse(['vendorId is required']);
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: { vendorId, isVisible: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.review.count({ where: { vendorId, isVisible: true } }),
    ]);

    return successResponse(reviews, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return errorResponse('Failed to get reviews', 500);
  }
}
