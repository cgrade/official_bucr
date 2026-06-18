import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

// GET /api/vendor/subscription/billing - Get billing history
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    // Get vendor
    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Get payment history for subscriptions
    const payments = await db.payment.findMany({
      where: {
        vendorId: vendor.id,
        purpose: 'subscription',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format billing history
    const billingHistory = payments.map((payment) => ({
      id: payment.id,
      date: payment.createdAt,
      amount: payment.amountKobo / 100, // Convert from kobo to naira
      status: payment.status,
      reference: payment.reference,
      plan: (payment.metadata as any)?.tier || 'Unknown',
      paymentMethod: payment.channel || 'card',
    }));

    return successResponse(billingHistory);
  } catch (error) {
    console.error('Get billing history error:', error);
    return errorResponse('Failed to get billing history', 500);
  }
}
