import { NextRequest } from 'next/server';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const verifyPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    // Owner OR invited staff (check-in is a staff-level capability).
    const ctx = await getVendorContext(payload);
    const vendor = ctx?.vendor;
    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }
    if (!can(ctx, 'check_in')) {
      return forbiddenResponse('You do not have permission to check guests in');
    }
    const body = await request.json();
    const validation = verifyPinSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { pin } = validation.data;

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Find reservation by PIN for today at any of vendor's branches
    const reservation = await db.reservation.findFirst({
      where: {
        pin: pin,
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
        vendorId: vendor.id,
        status: {
          in: ['confirmed', 'pending'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!reservation) {
      return errorResponse('No reservation found with this PIN for today', 404);
    }

    // Get guest profile if exists
    const guestProfile = await db.guestProfile.findUnique({
      where: {
        vendorId_userId: {
          userId: reservation.userId,
          vendorId: vendor.id,
        },
      },
      select: {
        visitCount: true,
        preferences: true,
        notes: true,
        isVip: true,
        tags: true,
      },
    }).catch(() => null);

    return successResponse({
      id: reservation.id,
      reference: reservation.reference,
      reservationDate: reservation.date,
      reservationTime: reservation.time,
      partySize: reservation.partySize,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      creditsDeposited: reservation.creditsDeposited,
      user: reservation.user,
      branch: reservation.branch,
      guestProfile,
    });
  } catch (error) {
    console.error('Verify PIN error:', error);
    return errorResponse('Failed to verify PIN', 500);
  }
}
