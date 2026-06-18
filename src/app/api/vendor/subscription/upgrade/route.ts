import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import {
  initializePayment,
  getSubscriptionPrice,
} from '@/services/payment.service';

const upgradeSchema = z.object({
  planId: z.enum(['basic', 'pro', 'premium']),
  callbackUrl: z.string().url().optional(),
});

// POST /api/vendor/subscription/upgrade - Upgrade subscription plan
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = upgradeSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { planId, callbackUrl } = validation.data;

    // Get vendor
    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Check if already on this plan
    if (vendor.subscriptionTier === planId) {
      return errorResponse('You are already on this plan', 400);
    }

    // Get user email for payment
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { email: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get subscription price
    const amountKobo = getSubscriptionPrice(planId);

    // Initialize payment via Paystack
    const paymentResult = await initializePayment({
      vendorId: vendor.id,
      purpose: 'subscription',
      amountKobo,
      email: user.email,
      callbackUrl,
      metadata: {
        tier: planId,
        vendorId: vendor.id,
        businessName: vendor.businessName,
        upgradeFrom: vendor.subscriptionTier,
      },
    });

    return successResponse(
      {
        payment: paymentResult.payment,
        authorizationUrl: paymentResult.authorizationUrl,
        accessCode: paymentResult.accessCode,
        planId,
        amountNgn: amountKobo / 100,
      },
      'Payment initialized. Complete payment to upgrade subscription.'
    );
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to initialize upgrade', 500);
  }
}
