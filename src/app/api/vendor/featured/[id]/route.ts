import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const patchSchema = z.object({
  autoRenew: z.boolean(),
});

// PATCH /api/vendor/featured/[id] - toggle auto-renew on the vendor's own spot
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse('Vendor access required');
    }

    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) return errorResponse('Vendor not found', 404);

    const body = await request.json();
    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
    }

    // Only allow toggling the vendor's own spot.
    const spot = await db.featuredSpot.findFirst({
      where: { id: params.id, vendorId: vendor.id },
      select: { id: true },
    });
    if (!spot) return notFoundResponse('Featured spot');

    const updated = await db.featuredSpot.update({
      where: { id: spot.id },
      data: { autoRenew: validation.data.autoRenew },
      select: { id: true, autoRenew: true },
    });

    return successResponse(
      updated,
      validation.data.autoRenew ? 'Auto-renew turned on' : 'Auto-renew turned off',
    );
  } catch (error) {
    console.error('Toggle featured auto-renew error:', error);
    return errorResponse('Failed to update featured spot', 500);
  }
}
