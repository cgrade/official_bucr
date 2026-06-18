import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export const DELETE = withRateLimit(
  withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    // Check if gallery item exists and belongs to vendor
    const galleryItem = await db.galleryImage.findFirst({
      where: { 
        id, 
        vendorId: vendor.id 
      },
    });

    if (!galleryItem) {
      return errorResponse('Gallery item not found', 404);
    }

    // Delete the gallery item
    await db.galleryImage.delete({
      where: { id },
    });

    return successResponse(null, 'Gallery item deleted successfully');
  }),
  apiLimiter
);
