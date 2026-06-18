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
import { purchaseCredits } from '@/services/credit.service';
import {
  initializePayment,
  verifyPayment,
  calculateAmountForCredits,
} from '@/services/payment.service';

// Schema for initializing a credit purchase payment
const initPurchaseSchema = z.object({
  credits: z.number().int().positive().min(10, 'Minimum purchase is 10 credits'),
  callbackUrl: z.string().url().optional(),
});

// Schema for completing a credit purchase (after payment)
const completePurchaseSchema = z.object({
  reference: z.string().min(1, 'Payment reference is required'),
});

// Legacy schema for backward compatibility (test mode)
const legacyPurchaseSchema = z.object({
  credits: z.number().int().positive().min(10, 'Minimum purchase is 10 credits'),
  paystackReference: z.string().min(1, 'Paystack reference is required'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Legacy flow: Direct purchase with paystackReference (for backward compatibility/testing)
    if (body.paystackReference) {
      const validation = legacyPurchaseSchema.safeParse(body);
      if (!validation.success) {
        const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return validationErrorResponse(errors);
      }

      const { credits, paystackReference } = validation.data;
      const amountKobo = calculateAmountForCredits(credits);

      // In test/development mode, skip payment verification
      // In production, you should verify with Paystack API
      const isTestMode = process.env.NODE_ENV === 'test' || paystackReference.startsWith('test_');
      
      if (!isTestMode) {
        // Verify payment with Paystack
        const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${paystackReference}`, {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        });
        const verifyData = await verifyResponse.json();
        
        if (!verifyData.status || verifyData.data.status !== 'success') {
          return errorResponse('Payment verification failed', 400);
        }
        
        if (verifyData.data.amount !== amountKobo) {
          return errorResponse('Payment amount mismatch', 400);
        }
      }

      // Create credit transaction
      const transaction = await purchaseCredits({
        userId: payload.sub,
        credits,
        paystackReference,
        amountPaidKobo: amountKobo,
      });

      return successResponse(
        {
          transaction,
          creditsPurchased: credits,
          amountPaid: amountKobo / 100,
          newBalance: transaction.balanceAfter,
        },
        `Successfully purchased ${credits} credits`
      );
    }

    // Check if this is initializing a new payment or completing an existing one
    if (body.reference) {
      // Complete purchase flow - verify existing payment
      const validation = completePurchaseSchema.safeParse(body);
      if (!validation.success) {
        const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return validationErrorResponse(errors);
      }

      const { reference } = validation.data;

      // Verify payment with provider
      const result = await verifyPayment(reference);

      if (!result.success) {
        return errorResponse('Payment verification failed', 400);
      }

      // Get the payment to extract credits info
      const payment = await db.payment.findUnique({
        where: { reference },
      });

      if (!payment || payment.userId !== payload.sub) {
        return errorResponse('Payment not found', 404);
      }

      const metadata = payment.metadata as { credits?: number } | null;
      const credits = metadata?.credits || Math.floor(payment.amountKobo / (120 * 100)); // fallback calculation

      // Create credit transaction
      const transaction = await purchaseCredits({
        userId: payload.sub,
        credits,
        paystackReference: reference,
        amountPaidKobo: payment.amountKobo,
      });

      return successResponse(
        {
          transaction,
          creditsPurchased: credits,
          amountPaid: payment.amountKobo / 100,
          newBalance: transaction.balanceAfter,
        },
        `Successfully purchased ${credits} credits`
      );
    } else {
      // Initialize payment flow
      const validation = initPurchaseSchema.safeParse(body);
      if (!validation.success) {
        const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return validationErrorResponse(errors);
      }

      const { credits, callbackUrl } = validation.data;

      // Get user email
      const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { email: true },
      });

      if (!user) {
        return errorResponse('User not found', 404);
      }

      const amountKobo = calculateAmountForCredits(credits);

      // Initialize payment via Paystack
      // Paystack checkout handles all payment options (card, bank, USSD, mobile money)
      const result = await initializePayment({
        userId: payload.sub,
        purpose: 'credit_purchase',
        amountKobo,
        email: user.email,
        callbackUrl,
        metadata: { credits },
      });

      return successResponse(
        {
          payment: result.payment,
          authorizationUrl: result.authorizationUrl,
          accessCode: result.accessCode,
          credits,
          amountNgn: amountKobo / 100,
        },
        'Payment initialized. Complete payment to receive credits.'
      );
    }
  } catch (error) {
    console.error('Purchase credits error:', error);
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return errorResponse('User not found', 404);
      }
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to process credit purchase', 500);
  }
}
