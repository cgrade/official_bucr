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

const setFeaturedSchema = z.object({
  isFeatured: z.boolean(),
  featuredUntil: z.coerce.date().optional().nullable(),
});

// PATCH /api/admin/vendors/[id]/featured - Set vendor featured status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const body = await request.json();
    const validation = setFeaturedSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { isFeatured, featuredUntil } = validation.data;

    // Check vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: params.id },
      select: { id: true, businessName: true },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Update featured status
    const updatedVendor = await db.vendor.update({
      where: { id: params.id },
      data: {
        isFeatured,
        featuredAt: isFeatured ? new Date() : null,
        featuredUntil: isFeatured ? featuredUntil : null,
      },
      select: {
        id: true,
        businessName: true,
        isFeatured: true,
        featuredAt: true,
        featuredUntil: true,
      },
    });

    return successResponse(
      updatedVendor,
      `${vendor.businessName} ${isFeatured ? 'is now featured' : 'is no longer featured'}`
    );
  } catch (error) {
    console.error('Set vendor featured error:', error);
    return errorResponse('Failed to update featured status', 500);
  }
}

// GET /api/admin/vendors/[id]/featured - Get vendor featured status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const vendor = await db.vendor.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        businessName: true,
        isFeatured: true,
        featuredAt: true,
        featuredUntil: true,
      },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    return successResponse(vendor);
  } catch (error) {
    console.error('Get vendor featured status error:', error);
    return errorResponse('Failed to get featured status', 500);
  }
}
