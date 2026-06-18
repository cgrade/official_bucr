import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { confirmOrderPayment } from '@/services/order.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const order = await confirmOrderPayment(params.id, payload.sub);

    return successResponse(order, 'Payment confirmed. Your order is being processed.');
  } catch (error) {
    console.error('Confirm payment error:', error);
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Failed to confirm payment', 500);
  }
}
