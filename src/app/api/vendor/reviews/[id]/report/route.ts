import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const reportSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    const review = await db.review.findFirst({
      where: { id, vendorId: vendor.id },
    });

    if (!review) {
      return notFoundResponse('Review');
    }

    const body = await request.json();
    const validation = reportSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { reason } = validation.data;

    // Update the review with report info
    const updatedReview = await db.review.update({
      where: { id },
      data: {
        isReported: true,
        reportReason: reason,
        reportedAt: new Date(),
      },
    });

    return successResponse(updatedReview, 'Review reported successfully. Our team will review it.');
  } catch (error) {
    console.error('Report review error:', error);
    return errorResponse('Failed to report review', 500);
  }
}
