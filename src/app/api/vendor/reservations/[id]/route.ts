import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

// GET /api/vendor/reservations/[id] - Get reservation details for vendor
export async function GET(
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

    const reservation = await db.reservation.findFirst({
      where: {
        id: params.id,
        vendorId: vendor.id, // direct FK — reservations may have no branch (branchId nullable)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!reservation) {
      return notFoundResponse('Reservation');
    }

    return successResponse({
      id: reservation.id,
      reference: reservation.reference,
      date: reservation.date,
      time: reservation.time,
      partySize: reservation.partySize,
      status: reservation.status,
      specialRequests: reservation.specialRequests,
      occasion: reservation.occasion,
      preorderItems: reservation.preorderItems ?? null,
      pin: reservation.pin,
      qrCode: reservation.qrCode,
      creditsDeposited: reservation.creditsDeposited,
      creditsRefunded: reservation.creditsRefunded,
      checkedInAt: reservation.checkedInAt,
      cancelledAt: reservation.cancelledAt,
      cancellationReason: reservation.cancellationReason,
      createdAt: reservation.createdAt,
      user: (reservation as any).user,
      branch: (reservation as any).branch,
      experience: (reservation as any).experience,
    });
  } catch (error) {
    console.error('Get vendor reservation error:', error);
    return errorResponse('Failed to get reservation', 500);
  }
}
