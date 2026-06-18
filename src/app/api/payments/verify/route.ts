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
  verifyPayment,
  getPaymentByReference,
  processCompletedPayment,
} from '@/services/payment.service';

const verifySchema = z.object({
  reference: z.string().min(1, 'Payment reference is required'),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { reference } = validation.data;

    // Check if payment belongs to user
    const payment = await getPaymentByReference(reference);
    
    if (!payment) {
      return errorResponse('Payment not found', 404);
    }

    if (payment.userId && payment.userId !== payload.sub) {
      return errorResponse('Payment not found', 404);
    }

    // Verify payment with provider
    const result = await verifyPayment(reference);

    // If payment was completed, process it
    if (result.success && result.payment.status === 'completed') {
      await processCompletedPayment(payment.id);
    }

    return successResponse(
      {
        verified: result.success,
        payment: result.payment,
      },
      result.success ? 'Payment verified successfully' : 'Payment verification failed'
    );
  } catch (error) {
    console.error('Verify payment error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to verify payment', 500);
  }
}
