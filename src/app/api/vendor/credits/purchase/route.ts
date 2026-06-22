import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { purchaseVendorCredits } from '@/services/credit.service';
import {
  initializePayment,
  verifyPayment,
  calculateAmountForCredits,
  calculateCreditsFromAmount,
} from '@/services/payment.service';

const initPurchaseSchema = z.object({
  credits: z.number().int().positive().min(10, 'Minimum purchase is 10 credits'),
  callbackUrl: z.string().url().optional(),
});

const completePurchaseSchema = z.object({
  reference: z.string().min(1, 'Payment reference is required'),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
    select: { id: true, email: true, businessName: true },
  });
}

/**
 * POST /api/vendor/credits/purchase
 * Initialize or complete a vendor credit purchase
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const body = await request.json();

    // Complete purchase flow - verify existing payment
    if (body.reference) {
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

      if (!payment || payment.vendorId !== vendor.id) {
        return errorResponse('Payment not found', 404);
      }

      // Check if already processed
      const existingTx = await db.vendorCreditTransaction.findFirst({
        where: { referenceId: reference },
      });

      if (existingTx) {
        return successResponse({
          transaction: existingTx,
          creditsPurchased: existingTx.amount,
          amountPaid: payment.amountKobo / 100,
          newBalance: existingTx.balanceAfter,
          alreadyProcessed: true,
        }, 'Credits already added to your wallet');
      }

      const metadata = payment.metadata as { credits?: number } | null;
      const credits = metadata?.credits || calculateCreditsFromAmount(payment.amountKobo);

      // Create credit transaction
      const transaction = await purchaseVendorCredits({
        vendorId: vendor.id,
        credits,
        description: `Purchased ${credits} credits (ref: ${reference}, ₦${payment.amountKobo / 100})`,
      });

      return successResponse({
        transaction,
        creditsPurchased: credits,
        amountPaid: payment.amountKobo / 100,
        newBalance: transaction.balanceAfter,
      }, `Successfully purchased ${credits} credits`);
    }

    // Initialize payment flow
    const validation = initPurchaseSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { credits, callbackUrl } = validation.data;
    const amountKobo = calculateAmountForCredits(credits);

    // Initialize payment via Paystack
    const result = await initializePayment({
      vendorId: vendor.id,
      purpose: 'credit_purchase',
      amountKobo,
      email: vendor.email,
      callbackUrl,
      metadata: { credits, vendorId: vendor.id, businessName: vendor.businessName },
    });

    return successResponse({
      payment: result.payment,
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      credits,
      amountNgn: amountKobo / 100,
    }, 'Payment initialized. Complete payment to receive credits.');
  } catch (error) {
    console.error('Vendor credit purchase error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to process credit purchase', 500);
  }
}
