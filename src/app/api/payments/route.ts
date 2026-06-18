import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import {
  getPaymentsByUser,
  getPaymentsByVendor,
} from '@/services/payment.service';
import { db } from '@/lib/db';
import { PaymentPurpose, PaymentStatus } from '@prisma/client';

// GET /api/payments - Get payment history
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const purpose = searchParams.get('purpose') as PaymentPurpose | null;
    const status = searchParams.get('status') as PaymentStatus | null;

    let result;

    if (payload.role === 'vendor') {
      // Get vendor's payments
      const vendor = await db.vendor.findFirst({
        where: { ownerId: payload.sub, deletedAt: null },
      });

      if (!vendor) {
        return errorResponse('Vendor not found', 404);
      }

      result = await getPaymentsByVendor(vendor.id, {
        page,
        limit,
        ...(purpose && { purpose }),
        ...(status && { status }),
      });
    } else {
      // Get user's payments
      result = await getPaymentsByUser(payload.sub, {
        page,
        limit,
        ...(purpose && { purpose }),
        ...(status && { status }),
      });
    }

    return successResponse(result, undefined, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return errorResponse('Failed to get payment history', 500);
  }
}
