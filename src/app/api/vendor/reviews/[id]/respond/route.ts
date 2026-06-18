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

const respondSchema = z.object({
  response: z.string().min(10, 'Response must be at least 10 characters').max(500),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const review = await db.review.findFirst({
      where: { id: params.id, vendorId: vendor.id },
    });

    if (!review) {
      return notFoundResponse('Review');
    }

    const body = await request.json();
    const validation = respondSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { response } = validation.data;

    const updatedReview = await db.review.update({
      where: { id: params.id },
      data: {
        vendorResponse: response,
        respondedAt: new Date(),
      },
    });

    return successResponse(updatedReview, 'Response added successfully');
  } catch (error) {
    console.error('Respond to review error:', error);
    return errorResponse('Failed to respond to review', 500);
  }
}
