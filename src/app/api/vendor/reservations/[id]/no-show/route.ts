import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';
import { markNoShow } from '@/services/reservation.service';

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

    const result = await markNoShow(params.id, vendor.id);

    return successResponse(result, 'Reservation marked as no-show');
  } catch (error) {
    console.error('Mark no-show error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to mark no-show', 500);
  }
}
