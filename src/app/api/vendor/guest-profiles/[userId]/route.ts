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
  notFoundResponse,
} from '@/lib/utils/api-response';

const updateGuestProfileSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  preferences: z.record(z.unknown()).optional(),
  isVip: z.boolean().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    const profile = await db.guestProfile.findUnique({
      where: {
        vendorId_userId: {
          vendorId: vendor.id,
          userId: params.userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            dietaryRestrictions: true,
            seatingPreferences: true,
            specialOccasions: true,
          },
        },
      },
    });

    if (!profile) {
      return notFoundResponse('Guest profile');
    }

    // Get reservation history for this guest
    const reservations = await db.reservation.findMany({
      where: {
        userId: params.userId,
        vendorId: vendor.id,
      },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        reference: true,
        date: true,
        time: true,
        partySize: true,
        status: true,
      },
    });

    // Get order history for this guest
    const orders = await db.takeoutOrder.findMany({
      where: {
        userId: params.userId,
        vendorId: vendor.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reference: true,
        orderType: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });

    return successResponse({
      profile,
      history: {
        reservations,
        orders,
      },
    });
  } catch (error) {
    console.error('Get guest profile error:', error);
    return errorResponse('Failed to get guest profile', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    const body = await request.json();
    const validation = updateGuestProfileSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // Upsert guest profile
    const profile = await db.guestProfile.upsert({
      where: {
        vendorId_userId: {
          vendorId: vendor.id,
          userId: params.userId,
        },
      },
      create: {
        vendorId: vendor.id,
        userId: params.userId,
        notes: data.notes,
        tags: data.tags || [],
        preferences: data.preferences as object | undefined,
        isVip: data.isVip || false,
      },
      update: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.tags && { tags: data.tags }),
        ...(data.preferences && { preferences: data.preferences as object }),
        ...(data.isVip !== undefined && { isVip: data.isVip }),
      },
    });

    return successResponse(profile, 'Guest profile updated');
  } catch (error) {
    console.error('Update guest profile error:', error);
    return errorResponse('Failed to update guest profile', 500);
  }
}
