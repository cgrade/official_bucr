import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext } from '@/lib/auth/vendor-context';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';
import { checkInReservation } from '@/services/reservation.service';
import { syncVendorAchievements } from '@/services/achievement.service';

const checkInSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if reservation exists and belongs to this vendor.
    // Filter by the direct vendorId FK — branchId is nullable, so filtering
    // through the branch relation drops reservations that have no branch.
    const reservation = await db.reservation.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id,
      },
    });

    if (!reservation) {
      return notFoundResponse('Reservation');
    }

    if (reservation.status === 'checked_in') {
      return errorResponse('Reservation already checked in', 400);
    }

    if (reservation.status === 'cancelled') {
      return errorResponse('Reservation was cancelled', 400);
    }

    // Get PIN from body if provided, otherwise use the reservation's PIN
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body provided, use reservation PIN
    }

    const pin = body?.pin || reservation.pin;

    const result = await checkInReservation(params.id, pin, vendor.id);

    // Sync achievements fire-and-forget — may unlock "Trusted Vendor" (100+ bookings)
    syncVendorAchievements(vendor.id).catch(() => {});

    return successResponse(
      {
        reservation: result.reservation,
        creditsRefunded: result.creditsRefunded,
        bonusCredits: result.bonusCredits,
        message: `Guest checked in! ${result.creditsRefunded} credits refunded + ${result.bonusCredits} bonus credits awarded.`,
      },
      'Check-in successful'
    );
  } catch (error) {
    console.error('Check-in error:', error);
    if (error instanceof Error) {
      if (error.message === 'Invalid PIN') {
        return errorResponse('Invalid PIN', 400);
      }
      if (error.message.includes('not found')) {
        return errorResponse(error.message, 404);
      }
    }
    return errorResponse('Check-in failed', 500);
  }
}
