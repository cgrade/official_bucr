import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { createReservation } from '@/services/reservation.service';
import { sendReservationConfirmation } from '@/services/email.service';
import { db } from '@/lib/db';

const createReservationSchema = z.object({
  vendorId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  experienceId: z.string().uuid().optional(),
  date: z.coerce.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  partySize: z.number().int().positive().max(50),
  specialRequests: z.string().optional(),
  occasion: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = createReservationSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // Ensure date is in the future
    const reservationDate = new Date(data.date);
    const now = new Date();
    if (reservationDate < now) {
      return errorResponse('Reservation date must be in the future', 400);
    }

    const reservation = await createReservation({
      userId: payload.sub,
      vendorId: data.vendorId,
      branchId: data.branchId,
      experienceId: data.experienceId,
      date: reservationDate,
      time: data.time,
      partySize: data.partySize,
      specialRequests: data.specialRequests,
      occasion: data.occasion,
    });

    // Get user details for email
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { name: true, email: true },
    });

    // Send confirmation email (async, don't wait)
    if (user?.email && reservation.qrCode) {
      sendReservationConfirmation({
        to: user.email,
        userName: user.name,
        vendorName: reservation.vendor.businessName,
        date: reservationDate.toLocaleDateString('en-NG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: data.time,
        partySize: data.partySize,
        reference: reservation.reference,
        qrCodeUrl: reservation.qrCode,
        pin: reservation.pin!,
      }).catch(console.error);
    }

    return successResponse(
      {
        id: reservation.id,
        reference: reservation.reference,
        vendor: reservation.vendor,
        branch: reservation.branch,
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
        specialRequests: reservation.specialRequests,
        occasion: reservation.occasion,
        creditsDeposited: reservation.creditsDeposited,
        status: reservation.status,
        qrCode: reservation.qrCode,
        pin: reservation.pin,
        createdAt: reservation.createdAt,
      },
      'Reservation created successfully',
      undefined,
      201
    );
  } catch (error) {
    console.error('Create reservation error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Insufficient credits')) {
        return errorResponse('Insufficient credits for this reservation', 400);
      }
      if (error.message.includes('not found')) {
        return errorResponse(error.message, 404);
      }
    }
    return errorResponse('Failed to create reservation', 500);
  }
}
