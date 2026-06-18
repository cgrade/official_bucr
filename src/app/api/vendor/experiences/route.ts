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

const createExperienceSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.string(),
  creditsRequired: z.number().int().positive(),
  capacity: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  images: z.array(z.string()).optional(), // Allow local paths or URLs
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

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

    const experiences = await db.experience.findMany({
      where: { vendorId: vendor.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(experiences);
  } catch (error) {
    console.error('Get experiences error:', error);
    return errorResponse('Failed to get experiences', 500);
  }
}

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

    // Check subscription tier for experiences
    if (vendor.subscriptionTier === 'basic') {
      return forbiddenResponse('Experiences require Pro or Premium subscription');
    }

    const body = await request.json();
    const validation = createExperienceSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    const experience = await db.experience.create({
      data: {
        vendorId: vendor.id,
        title: data.title,
        description: data.description,
        type: data.type,
        creditsRequired: data.creditsRequired,
        capacity: data.capacity,
        duration: data.duration,
        availableDays: data.availableDays || [],
        startTime: data.startTime,
        endTime: data.endTime,
        images: data.images || [],
        isActive: true,
      },
    });

    return successResponse(experience, 'Experience created successfully', undefined, 201);
  } catch (error) {
    console.error('Create experience error:', error);
    return errorResponse('Failed to create experience', 500);
  }
}
