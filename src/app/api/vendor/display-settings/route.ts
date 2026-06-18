import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

const updateDisplaySettingsSchema = z.object({
  showExperiences: z.boolean().optional(),
  showSpecialOffers: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showGallery: z.boolean().optional(),
  showReviews: z.boolean().optional(),
  showMenu: z.boolean().optional(),
  promoMessage: z.string().max(500).optional().nullable(),
  promoEnabled: z.boolean().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/display-settings - Get current display settings
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

    const v = vendor as any;
    return successResponse({
      showExperiences: v.showExperiences ?? true,
      showSpecialOffers: v.showSpecialOffers ?? true,
      showAchievements: v.showAchievements ?? true,
      showGallery: v.showGallery ?? true,
      showReviews: v.showReviews ?? true,
      showMenu: v.showMenu ?? true,
      promoMessage: v.promoMessage ?? null,
      promoEnabled: v.promoEnabled ?? false,
    });
  } catch (error) {
    console.error('Get display settings error:', error);
    return errorResponse('Failed to get display settings', 500);
  }
}

// PATCH /api/vendor/display-settings - Update display settings
export async function PATCH(request: NextRequest) {
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
    const validation = updateDisplaySettingsSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const updatedVendor = await db.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(data.showExperiences !== undefined && { showExperiences: data.showExperiences }),
        ...(data.showSpecialOffers !== undefined && { showSpecialOffers: data.showSpecialOffers }),
        ...(data.showAchievements !== undefined && { showAchievements: data.showAchievements }),
        ...(data.showGallery !== undefined && { showGallery: data.showGallery }),
        ...(data.showReviews !== undefined && { showReviews: data.showReviews }),
        ...(data.showMenu !== undefined && { showMenu: data.showMenu }),
        ...(data.promoMessage !== undefined && { promoMessage: data.promoMessage }),
        ...(data.promoEnabled !== undefined && { promoEnabled: data.promoEnabled }),
      },
      select: {
        showExperiences: true,
        showSpecialOffers: true,
        showAchievements: true,
        showGallery: true,
        showReviews: true,
        showMenu: true,
        promoMessage: true,
        promoEnabled: true,
      },
    });

    return successResponse(updatedVendor, 'Display settings updated successfully');
  } catch (error) {
    console.error('Update display settings error:', error);
    return errorResponse('Failed to update display settings', 500);
  }
}
