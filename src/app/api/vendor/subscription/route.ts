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
  getVendorSubscription,
  getSubscriptionHistory,
  getSubscriptionTiers,
  cancelSubscription,
  toggleAutoRenew,
} from '@/services/subscription.service';
import {
  initializePayment,
  getSubscriptionPrice,
} from '@/services/payment.service';

const subscribeSchema = z.object({
  tier: z.enum(['basic', 'pro', 'elite']),
  callbackUrl: z.string().url().optional(),
});

const autoRenewSchema = z.object({
  autoRenew: z.boolean(),
});

// GET /api/vendor/subscription - Get current subscription details
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    // Get vendor ID from user
    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const subscription = await getVendorSubscription(vendor.id);
    const tiers = getSubscriptionTiers();

    const response: Record<string, unknown> = {
      subscription,
      tiers,
    };

    if (includeHistory) {
      const history = await getSubscriptionHistory(vendor.id);
      response.history = history;
    }

    return successResponse(response);
  } catch (error) {
    console.error('Get subscription error:', error);
    return errorResponse('Failed to get subscription details', 500);
  }
}

// POST /api/vendor/subscription - Subscribe or upgrade
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = subscribeSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { tier, callbackUrl } = validation.data;

    // Get vendor
    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      include: {
        branches: { where: { isMainBranch: true }, take: 1 },
      },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
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
    const amountKobo = getSubscriptionPrice(tier);

    // Initialize payment via Paystack
    // Paystack checkout shows all payment options (card, bank, USSD, mobile money)
    const paymentResult = await initializePayment({
      vendorId: vendor.id,
      purpose: 'subscription',
      amountKobo,
      email: user.email,
      callbackUrl,
      metadata: {
        tier,
        vendorId: vendor.id,
        businessName: vendor.businessName,
      },
    });

    return successResponse(
      {
        payment: paymentResult.payment,
        authorizationUrl: paymentResult.authorizationUrl,
        accessCode: paymentResult.accessCode,
        tier,
        amountNgn: amountKobo / 100,
      },
      'Payment initialized. Complete payment to activate subscription.'
    );
  } catch (error) {
    console.error('Subscribe error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to initialize subscription', 500);
  }
}

// PATCH /api/vendor/subscription - Update subscription settings (auto-renew)
export async function PATCH(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = autoRenewSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    await toggleAutoRenew(vendor.id, validation.data.autoRenew);

    return successResponse(
      { autoRenew: validation.data.autoRenew },
      `Auto-renewal ${validation.data.autoRenew ? 'enabled' : 'disabled'}`
    );
  } catch (error) {
    console.error('Update subscription error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to update subscription', 500);
  }
}

// DELETE /api/vendor/subscription - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    await cancelSubscription(vendor.id);

    return successResponse(
      null,
      'Subscription cancelled. You will retain access until the end of your billing period.'
    );
  } catch (error) {
    console.error('Cancel subscription error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to cancel subscription', 500);
  }
}
