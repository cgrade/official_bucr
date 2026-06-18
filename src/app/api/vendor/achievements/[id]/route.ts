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

const updateAchievementSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  badgeType: z.string().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/achievements/[id] - Get single achievement
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

    const achievement = await db.achievement.findFirst({
      where: { id: params.id, vendorId: vendor.id },
    });

    if (!achievement) {
      return notFoundResponse('Achievement not found');
    }

    return successResponse(achievement);
  } catch (error) {
    console.error('Get achievement error:', error);
    return errorResponse('Failed to get achievement', 500);
  }
}

// PATCH /api/vendor/achievements/[id] - Update achievement
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

    const existing = await db.achievement.findFirst({
      where: { id: params.id, vendorId: vendor.id },
    });

    if (!existing) {
      return notFoundResponse('Achievement not found');
    }

    const body = await request.json();
    const validation = updateAchievementSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors.map(e => e.message));
    }

    const achievement = await db.achievement.update({
      where: { id: params.id },
      data: validation.data,
    });

    return successResponse(achievement);
  } catch (error) {
    console.error('Update achievement error:', error);
    return errorResponse('Failed to update achievement', 500);
  }
}

// DELETE /api/vendor/achievements/[id] - Delete achievement
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

    const existing = await db.achievement.findFirst({
      where: { id: params.id, vendorId: vendor.id },
    });

    if (!existing) {
      return notFoundResponse('Achievement not found');
    }

    await db.achievement.delete({
      where: { id: params.id },
    });

    return successResponse({ message: 'Achievement deleted' });
  } catch (error) {
    console.error('Delete achievement error:', error);
    return errorResponse('Failed to delete achievement', 500);
  }
}
