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

export const DELETE = withRateLimit(
  withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // Check if favorite exists and belongs to user
    const favorite = await db.favorite.findFirst({
      where: { 
        vendorId: id,
        userId: payload.sub 
      },
    });

    if (!favorite) {
      return errorResponse('Favorite not found', 404);
    }

    // Delete the favorite
    await db.favorite.delete({
      where: { 
        id: favorite.id 
      },
    });

    return successResponse(null, 'Removed from favorites');
  }),
  apiLimiter
);
