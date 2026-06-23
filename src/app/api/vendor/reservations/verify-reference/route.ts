import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext } from '@/lib/auth/vendor-context';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const verifyReferenceSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const __vctx = await getVendorContext(payload);
    const vendor = __vctx?.vendor;
    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }
    const body = await request.json();
    const validation = verifyReferenceSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    let { reference } = validation.data;

    // Normalize reference (add BKR- prefix if not present)
    if (!reference.startsWith('BKR-')) {
      reference = `BKR-${reference}`;
    }

    // Find reservation by reference
    const reservation = await db.reservation.findFirst({
      where: {
        reference,
        vendorId: vendor.id,
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
      return notFoundResponse('Reservation');
    }

    // Check if reservation is for today or in the past (within grace period)
    const now = new Date();
    const reservationDate = new Date(reservation.date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resDate = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());

    if (resDate > today) {
      return errorResponse('Reservation is for a future date. Check-in not allowed yet.', 400);
    }

    // Check status
    if (reservation.status === 'checked_in') {
      return errorResponse('Reservation already checked in', 400);
    }

    if (reservation.status === 'cancelled') {
      return errorResponse('Reservation was cancelled', 400);
    }

    if (reservation.status === 'no_show') {
      return errorResponse('Reservation marked as no-show', 400);
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
    console.error('Verify reference error:', error);
    return errorResponse('Failed to verify reference', 500);
  }
}
