import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import {
  initializePayment,
  calculateAmountForCredits,
  PaystackChannel,
} from '@/services/payment.service';

const initializePaymentSchema = z.object({
  purpose: z.enum(['credit_purchase', 'subscription', 'order_payment']),
  // For credit purchase
  credits: z.number().int().positive().min(10).optional(),
  // For subscription
  tier: z.enum(['basic', 'pro', 'elite']).optional(),
  // For order payment
  orderId: z.string().uuid().optional(),
  amountKobo: z.number().int().positive().optional(),
  // Common
  callbackUrl: z.string().url().optional(),
  // Optional: restrict to specific payment channels
  channels: z.array(z.enum(['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'])).optional(),
}).refine((data) => {
  if (data.purpose === 'credit_purchase' && !data.credits) {
    return false;
  }
  if (data.purpose === 'subscription' && !data.tier) {
    return false;
  }
  if (data.purpose === 'order_payment' && !data.amountKobo) {
    return false;
  }
  return true;
}, {
  message: 'Missing required fields for the selected payment purpose',
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = initializePaymentSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { purpose, credits, tier, orderId, amountKobo, callbackUrl, channels } = validation.data;

    // Determine amount based on purpose
    let finalAmountKobo: number;
    const metadata: Record<string, unknown> = { purpose };

    switch (purpose) {
      case 'credit_purchase':
        finalAmountKobo = calculateAmountForCredits(credits!);
        metadata.credits = credits;
        break;
      case 'subscription':
        const { getSubscriptionPrice } = await import('@/services/payment.service');
        finalAmountKobo = getSubscriptionPrice(tier!);
        metadata.tier = tier;
        break;
      case 'order_payment':
        finalAmountKobo = amountKobo!;
        metadata.orderId = orderId;
        break;
      default:
        return errorResponse('Invalid payment purpose', 400);
    }

    // Get user email
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { email: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Initialize payment via Paystack
    // Paystack checkout handles all payment options (card, bank, USSD, mobile money)
    const result = await initializePayment({
      userId: payload.sub,
      purpose,
      amountKobo: finalAmountKobo,
      email: user.email,
      callbackUrl,
      metadata,
      channels: channels as PaystackChannel[] | undefined,
    });

    return successResponse(
      {
        payment: result.payment,
        authorizationUrl: result.authorizationUrl,
        accessCode: result.accessCode,
        amountNgn: finalAmountKobo / 100,
      },
      'Payment initialized successfully'
    );
  } catch (error) {
    console.error('Initialize payment error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to initialize payment', 500);
  }
}
