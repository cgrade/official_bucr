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

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/).optional(),
  avatar: z.string().url().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  seatingPreferences: z.string().optional(),
  specialOccasions: z.object({
    birthday: z.string().optional(),
    anniversary: z.string().optional(),
  }).optional(),
  pushToken: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        creditsBalance: true,
        dietaryRestrictions: true,
        seatingPreferences: true,
        specialOccasions: true,
        referralCode: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({ ...user, isVerified: !!(user.emailVerifiedAt || user.phoneVerifiedAt) });
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse('Failed to get profile', 500);
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { name, phone, avatar, dietaryRestrictions, seatingPreferences, specialOccasions, pushToken } =
      validation.data;

    // Check if phone is already taken by another user
    if (phone) {
      const existingUser = await db.user.findFirst({
        where: {
          phone,
          id: { not: payload.sub },
          deletedAt: null,
        },
      });

      if (existingUser) {
        return errorResponse('Phone number already in use', 409);
      }
    }

    const updatedUser = await db.user.update({
      where: { id: payload.sub },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
        ...(dietaryRestrictions && { dietaryRestrictions }),
        ...(seatingPreferences !== undefined && { seatingPreferences }),
        ...(specialOccasions && { specialOccasions }),
        ...(pushToken !== undefined && { pushToken }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        creditsBalance: true,
        dietaryRestrictions: true,
        seatingPreferences: true,
        specialOccasions: true,
        referralCode: true,
        updatedAt: true,
      },
    });

    return successResponse(updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}
