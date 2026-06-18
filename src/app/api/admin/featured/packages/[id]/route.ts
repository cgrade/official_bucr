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

const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  creditsCost: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/admin/featured/packages/[id] - Get a featured package
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const featuredPackage = await db.featuredPackage.findUnique({
      where: { id: params.id },
      include: {
        featuredSpots: {
          include: {
            vendor: {
              select: { id: true, businessName: true, slug: true, logo: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { featuredSpots: true },
        },
      },
    });

    if (!featuredPackage) {
      return errorResponse('Featured package not found', 404);
    }

    return successResponse(featuredPackage);
  } catch (error) {
    console.error('Get featured package error:', error);
    return errorResponse('Failed to get featured package', 500);
  }
}

// PATCH /api/admin/featured/packages/[id] - Update a featured package
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
    const validation = updatePackageSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const existingPackage = await db.featuredPackage.findUnique({
      where: { id: params.id },
    });

    if (!existingPackage) {
      return errorResponse('Featured package not found', 404);
    }

    const updatedPackage = await db.featuredPackage.update({
      where: { id: params.id },
      data: validation.data,
    });

    return successResponse(updatedPackage, 'Featured package updated successfully');
  } catch (error) {
    console.error('Update featured package error:', error);
    return errorResponse('Failed to update featured package', 500);
  }
}

// DELETE /api/admin/featured/packages/[id] - Delete a featured package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const existingPackage = await db.featuredPackage.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { featuredSpots: true } },
      },
    });

    if (!existingPackage) {
      return errorResponse('Featured package not found', 404);
    }

    // Check if package has active spots
    if (existingPackage._count.featuredSpots > 0) {
      return errorResponse(
        'Cannot delete package with active featured spots. Deactivate the package instead.',
        400
      );
    }

    await db.featuredPackage.delete({
      where: { id: params.id },
    });

    return successResponse(null, 'Featured package deleted successfully');
  } catch (error) {
    console.error('Delete featured package error:', error);
    return errorResponse('Failed to delete featured package', 500);
  }
}
