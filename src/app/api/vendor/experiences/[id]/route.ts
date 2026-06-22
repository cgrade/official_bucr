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
import { ECONOMICS } from '@/lib/config/economics';

const updateExperienceSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  creditsRequired: z.number().int()
    .min(ECONOMICS.EXPERIENCE_MIN_CREDITS, `Experiences must be at least ${ECONOMICS.EXPERIENCE_MIN_CREDITS} credits (₦${(ECONOMICS.EXPERIENCE_MIN_CREDITS * ECONOMICS.CREDIT_VALUE_NGN).toLocaleString()})`)
    .max(ECONOMICS.EXPERIENCE_MAX_CREDITS, `Experiences cannot exceed ${ECONOMICS.EXPERIENCE_MAX_CREDITS} credits`)
    .optional(),
  capacity: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/experiences/[id]
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

    const experience = await db.experience.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });

    if (!experience) {
      return notFoundResponse('Experience not found');
    }

    return successResponse(experience);
  } catch (error) {
    console.error('Get experience error:', error);
    return errorResponse('Failed to get experience', 500);
  }
}

// PATCH /api/vendor/experiences/[id]
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

    const existing = await db.experience.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });

    if (!existing) {
      return notFoundResponse('Experience not found');
    }

    const body = await request.json();
    const validation = updateExperienceSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.errors.map(e => e.message));
    }

    const experience = await db.experience.update({
      where: { id: params.id },
      data: validation.data,
    });

    return successResponse(experience);
  } catch (error) {
    console.error('Update experience error:', error);
    return errorResponse('Failed to update experience', 500);
  }
}

// DELETE /api/vendor/experiences/[id]
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

    const existing = await db.experience.findFirst({
      where: { id: params.id, vendorId: vendor.id, deletedAt: null },
    });

    if (!existing) {
      return notFoundResponse('Experience not found');
    }

    await db.experience.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return successResponse({ message: 'Experience deleted' });
  } catch (error) {
    console.error('Delete experience error:', error);
    return errorResponse('Failed to delete experience', 500);
  }
}
