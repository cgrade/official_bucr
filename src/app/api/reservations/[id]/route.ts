import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';
import { modifyReservation, cancelReservation } from '@/services/reservation.service';

const modifyReservationSchema = z.object({
  date: z.coerce.date().optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  partySize: z.number().int().positive().max(50).optional(),
  specialRequests: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const reservation = await db.reservation.findUnique({
      where: { id: params.id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        invitations: true,
      },
    });

    if (!reservation) {
      return notFoundResponse('Reservation');
    }

    // Check access
    if (payload.role === 'user' && reservation.userId !== payload.sub) {
      return unauthorizedResponse('Not authorized to view this reservation');
    }

    // For vendors, check if they own the vendor
    if (payload.role === 'vendor') {
      const vendor = await db.vendor.findFirst({
        where: { ownerId: payload.sub, id: reservation.vendorId },
      });
      if (!vendor) {
        return unauthorizedResponse('Not authorized to view this reservation');
      }
    }

    return successResponse(reservation);
  } catch (error) {
    console.error('Get reservation error:', error);
    return errorResponse('Failed to get reservation', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = modifyReservationSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const updatedReservation = await modifyReservation(
      params.id,
      payload.sub,
      validation.data
    );

    return successResponse(updatedReservation, 'Reservation modified successfully');
  } catch (error) {
    console.error('Modify reservation error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to modify reservation', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    let cancelledBy: 'user' | 'vendor' = 'user';

    // Check if cancelling as vendor
    if (payload.role === 'vendor') {
      const reservation = await db.reservation.findUnique({
        where: { id: params.id },
      });

      if (!reservation) {
        return notFoundResponse('Reservation');
      }

      const vendor = await db.vendor.findFirst({
        where: { ownerId: payload.sub, id: reservation.vendorId },
      });

      if (!vendor) {
        return unauthorizedResponse('Not authorized to cancel this reservation');
      }

      cancelledBy = 'vendor';
    }

    const result = await cancelReservation(
      params.id,
      payload.sub,
      cancelledBy,
      reason
    );

    return successResponse(
      {
        reservation: result.reservation,
        creditsRefunded: result.creditsRefunded,
        bonusCredits: result.bonusCredits,
        creditsForfeited: result.creditsForfeited,
      },
      'Reservation cancelled successfully'
    );
  } catch (error) {
    console.error('Cancel reservation error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to cancel reservation', 500);
  }
}
