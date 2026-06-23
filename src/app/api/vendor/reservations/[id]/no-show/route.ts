import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';
import { markNoShow } from '@/services/reservation.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const ctx = await getVendorContext(payload);
    const vendor = ctx?.vendor;

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }
    if (!can(ctx, 'check_in')) {
      return forbiddenResponse('You do not have permission to check guests in');
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
