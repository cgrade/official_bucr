import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const reservation = await db.reservation.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!reservation) {
      return errorResponse('Reservation not found', 404);
    }

    if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
      return errorResponse('Reservation cannot be cancelled', 400);
    }

    // Refund credits to user (admin cancellation = full refund)
    await db.$transaction([
      db.reservation.update({
        where: { id: params.id },
        data: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'admin',
        },
      }),
      db.user.update({
        where: { id: reservation.userId },
        data: {
          creditsBalance: { increment: reservation.creditsDeposited },
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: reservation.userId,
          type: 'refund',
          amount: reservation.creditsDeposited,
          balanceAfter: reservation.user.creditsBalance + reservation.creditsDeposited,
          description: `Admin cancelled reservation ${reservation.reference}`,
          referenceType: 'reservation',
          referenceId: reservation.id,
        },
      }),
    ]);

    return successResponse({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    console.error('Admin cancel reservation error:', error);
    return errorResponse('Failed to cancel reservation', 500);
  }
}
