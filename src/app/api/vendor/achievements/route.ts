import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const createAchievementSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
  badgeType: z.string().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/achievements - Get all achievements
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const achievements = await db.achievement.findMany({
      where: { vendorId: vendor.id },
      orderBy: { earnedAt: 'desc' },
    });

    return successResponse(achievements);
  } catch (error) {
    console.error('Get achievements error:', error);
    return errorResponse('Failed to get achievements', 500);
  }
}

// POST /api/vendor/achievements - Create achievement
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const body = await request.json();
    const validation = createAchievementSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors.map(e => e.message));
    }

    const achievement = await db.achievement.create({
      data: {
        vendorId: vendor.id,
        title: validation.data.title,
        description: validation.data.description,
        icon: validation.data.icon,
        badgeType: validation.data.badgeType,
      },
    });

    return successResponse(achievement);
  } catch (error) {
    console.error('Create achievement error:', error);
    return errorResponse('Failed to create achievement', 500);
  }
}
