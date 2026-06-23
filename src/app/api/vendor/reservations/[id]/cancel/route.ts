import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import { cancelReservation } from '@/services/reservation.service';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

/**
 * PATCH /api/vendor/reservations/[id]/cancel — vendor-initiated cancellation.
 * Owner OR staff with the `cancel_reservation` capability. The reservation must
 * belong to this vendor (ownership check). Funds the 10% guest compensation from
 * the vendor wallet (handled inside cancelReservation, atomic).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();

    const ctx = await getVendorContext(payload);
    if (!ctx?.vendor) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'cancel_reservation')) {
      return forbiddenResponse('You do not have permission to cancel reservations');
    }

    // Ownership: only cancel reservations that belong to THIS vendor.
    const reservation = await db.reservation.findFirst({
      where: { id: params.id, vendorId: ctx.vendor.id },
      select: { id: true },
    });
    if (!reservation) return notFoundResponse('Reservation');

    const body = await request.json().catch(() => ({}));
    const result = await cancelReservation(params.id, ctx.vendor.ownerId, 'vendor', body?.reason);
    return successResponse(result, 'Reservation cancelled');
  } catch (error: any) {
    console.error('Vendor cancel reservation error:', error);
    return errorResponse(error?.message || 'Failed to cancel reservation', 400);
  }
}
