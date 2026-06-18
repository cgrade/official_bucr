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
import { checkInReservation } from '@/services/reservation.service';

const checkInSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function POST(
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

    // Check if reservation exists and belongs to this vendor
    const reservation = await db.reservation.findFirst({
      where: {
        id: params.id,
        branch: {
          vendorId: vendor.id,
        },
      },
    });

    if (!reservation) {
      return notFoundResponse('Reservation not found');
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
