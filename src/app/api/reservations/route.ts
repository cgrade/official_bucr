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
import { ECONOMICS } from '@/lib/config/economics';
import { combineDateAndTime } from '@/lib/utils/datetime';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
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
    const limited = applyRateLimit(request, 'payment');
    if (limited) return limited;

    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    // Trust gate: a deposit is real money on a no-show, so require a verified email or
    // phone before booking. Returns a machine-readable code so clients can route to verify.
    if (ECONOMICS.REQUIRE_VERIFICATION_TO_BOOK) {
      const u = await db.user.findUnique({
        where: { id: payload.sub },
        select: { emailVerifiedAt: true, phoneVerifiedAt: true },
      });
      if (!u?.emailVerifiedAt && !u?.phoneVerifiedAt) {
        return errorResponse('Please verify your email or phone before booking.', 403, 'VERIFICATION_REQUIRED');
      }
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
    // (midnight); fold in the booking time in the business timezone (not the server's) so
    // same-day bookings work and the check is identical across deploy environments.
    const reservationDate = new Date(data.date);
    const reservationDateTime = combineDateAndTime(data.date, data.time);
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
      // Booking-validation messages (e.g. closed hours) are safe to surface verbatim.
      if (error.message.includes('closed') || error.message.includes('opening hours')) {
        return errorResponse(error.message, 400);
      }
    }
    return errorResponse('Failed to create reservation', 500);
  }
}
