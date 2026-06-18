import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const updateOfferSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  image: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  discountType: z.enum(['percentage', 'fixed', 'bogo']).optional().nullable(),
  discountValue: z.number().int().positive().optional().nullable(),
  terms: z.string().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/special-offers/[id]
export async function GET(
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

    const offer = await db.specialOffer.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });

    if (!offer) {
      return notFoundResponse('Special offer not found');
    }

    return successResponse(offer);
  } catch (error) {
    console.error('Get special offer error:', error);
    return errorResponse('Failed to get special offer', 500);
  }
}

// PATCH /api/vendor/special-offers/[id]
export async function PATCH(
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

    const existing = await db.specialOffer.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });

    if (!existing) {
      return notFoundResponse('Special offer not found');
    }

    const body = await request.json();
    const validation = updateOfferSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const offer = await db.specialOffer.update({
      where: { id: params.id },
      data: {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : data.validFrom,
        validUntil: data.validUntil ? new Date(data.validUntil) : data.validUntil,
      },
    });

    return successResponse(offer);
  } catch (error) {
    console.error('Update special offer error:', error);
    return errorResponse('Failed to update special offer', 500);
  }
}

// DELETE /api/vendor/special-offers/[id]
export async function DELETE(
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

    const existing = await db.specialOffer.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });

    if (!existing) {
      return notFoundResponse('Special offer not found');
    }

    await db.specialOffer.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return successResponse({ message: 'Special offer deleted' });
  } catch (error) {
    console.error('Delete special offer error:', error);
    return errorResponse('Failed to delete special offer', 500);
  }
}
