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

const updateVendorSchema = z.object({
  verificationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  subscriptionTier: z.enum(['basic', 'pro', 'premium']).optional(),
  subscriptionExpiresAt: z.coerce.date().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const vendor = await db.vendor.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        branches: { where: { deletedAt: null } },
        documents: true,
        _count: {
          select: {
            reservations: true,
            orders: true,
            reviews: true,
          },
        },
      },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    return successResponse(vendor);
  } catch (error) {
    console.error('Admin get vendor error:', error);
    return errorResponse('Failed to get vendor', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const vendor = await db.vendor.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    const body = await request.json();
    const validation = updateVendorSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const updatedVendor = await db.vendor.update({
      where: { id: params.id },
      data: {
        ...(data.verificationStatus && { verificationStatus: data.verificationStatus }),
        ...(data.subscriptionTier && { subscriptionTier: data.subscriptionTier }),
        ...(data.subscriptionExpiresAt && { subscriptionExpiresAt: data.subscriptionExpiresAt }),
      },
    });

    return successResponse(updatedVendor, 'Vendor updated successfully');
  } catch (error) {
    console.error('Admin update vendor error:', error);
    return errorResponse('Failed to update vendor', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const vendor = await db.vendor.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    // Soft delete
    await db.vendor.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return successResponse(null, 'Vendor deleted successfully');
  } catch (error) {
    console.error('Admin delete vendor error:', error);
    return errorResponse('Failed to delete vendor', 500);
  }
}
