import { NextRequest } from 'next/server';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
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
} from '@/lib/utils/api-response';
import { parseQRCodeData } from '@/services/qrcode.service';

const verifyQRSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
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
    const validation = verifyQRSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { qrData } = validation.data;

    // Mobile app encodes JSON via generateQRCode(); legacy scanners used BUCR:ref:pin
    let reference: string | undefined;
    let pin: string | undefined;
    let reservationId: string | undefined;

    const parsed = parseQRCodeData(qrData.trim());
    if (parsed?.type === 'reservation' && parsed.reference && parsed.pin) {
      reference = parsed.reference;
      pin = parsed.pin;
      reservationId = parsed.id;
    } else {
      const parts = qrData.split(':');
      if (parts.length >= 3 && parts[0] === 'BUCR') {
        reference = parts[1];
        pin = parts[2];
      } else {
        return errorResponse('Invalid QR code format', 400);
      }
    }

    if (!reference || !pin) {
      return errorResponse('Invalid QR code format', 400);
    }

    // Find reservation (prefer stable id from payload when present)
    const reservation = await db.reservation.findFirst({
      where: {
        ...(reservationId ? { id: reservationId } : { reference }),
        ...(pin ? { pin } : {}),
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
      return errorResponse('Reservation not found or invalid QR code', 404);
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
    console.error('Verify QR error:', error);
    return errorResponse('Failed to verify QR code', 500);
  }
}
