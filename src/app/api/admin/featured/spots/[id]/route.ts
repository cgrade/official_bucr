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

const updateSpotSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/featured/spots/[id] - Get a featured spot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const spot = await db.featuredSpot.findUnique({
      where: { id: params.id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
            galleryImages: { take: 3, orderBy: { sortOrder: 'asc' } },
          },
        },
        package: true,
      },
    });

    if (!spot) {
      return errorResponse('Featured spot not found', 404);
    }

    return successResponse(spot);
  } catch (error) {
    console.error('Get featured spot error:', error);
    return errorResponse('Failed to get featured spot', 500);
  }
}

// PATCH /api/admin/featured/spots/[id] - Update a featured spot
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
    const validation = updateSpotSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const existingSpot = await db.featuredSpot.findUnique({
      where: { id: params.id },
    });

    if (!existingSpot) {
      return errorResponse('Featured spot not found', 404);
    }

    const updatedSpot = await db.featuredSpot.update({
      where: { id: params.id },
      data: validation.data,
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true },
        },
        package: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return successResponse(updatedSpot, 'Featured spot updated successfully');
  } catch (error) {
    console.error('Update featured spot error:', error);
    return errorResponse('Failed to update featured spot', 500);
  }
}

// DELETE /api/admin/featured/spots/[id] - Delete a featured spot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const existingSpot = await db.featuredSpot.findUnique({
      where: { id: params.id },
      include: {
        vendor: { select: { businessName: true } },
      },
    });

    if (!existingSpot) {
      return errorResponse('Featured spot not found', 404);
    }

    await db.featuredSpot.delete({
      where: { id: params.id },
    });

    return successResponse(
      null,
      `Featured spot for ${existingSpot.vendor.businessName} deleted successfully`
    );
  } catch (error) {
    console.error('Delete featured spot error:', error);
    return errorResponse('Failed to delete featured spot', 500);
  }
}
