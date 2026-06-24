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
import { getOperationalSettings } from '@/lib/config/system-settings';
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
  // Optional pre-order — dishes the guest wants prepped ahead (data-only; paid at venue).
  preorderItems: z.array(z.object({
    menuItemId: z.string(),
    name: z.string(),
    quantity: z.number().int().positive().max(50),
  })).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    // Idempotency: if client sends Idempotency-Key header, return existing reservation
    // if same key was used within the last 24 hours. Prevents double-booking on retry.
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) {
      const existing = await db.reservation.findFirst({
        where: {
          userId: payload.sub,
          idempotencyKey,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        include: {
          vendor:  { select: { businessName: true, slug: true } },
          branch:  { select: { address: true, city: true } },
        },
      });
      if (existing) {
        return successResponse(existing, 'Reservation already exists', undefined, 200);
      }
    }

    const body = await request.json();
    const validation = createReservationSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // Enforce the admin-configured maximum party size (Settings → General).
    const { maxPartySize } = await getOperationalSettings();
    if (data.partySize > maxPartySize) {
      return errorResponse(`Party size cannot exceed ${maxPartySize} guests`, 400);
    }

    // Ensure the reservation date+TIME is in the future. data.date is a calendar day
    // (midnight), so we must fold in the booking time for the check — otherwise every
    // same-day reservation (the common case for dining) would be rejected. Build a
    // separate datetime (don't mutate reservationDate, which is stored as the day) the
    // same way check-in/cancel reconstruct it, so the comparison is consistent.
    const reservationDate = new Date(data.date);
    const reservationDateTime = new Date(reservationDate);
    if (data.time) {
      const [hh, mm] = data.time.split(':').map(Number);
      reservationDateTime.setHours(hh || 0, mm || 0, 0, 0);
    }
    if (reservationDateTime.getTime() < Date.now()) {
      return errorResponse('Reservation date/time must be in the future', 400);
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
      preorderItems: data.preorderItems,
      idempotencyKey: idempotencyKey ?? undefined,
    });

    // Confirmation email + push + vendor notification are all sent by
    // createReservation() in the service layer (preference-gated), so the route
    // no longer sends a duplicate email here.

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
