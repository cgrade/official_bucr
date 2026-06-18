import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import { purchaseEventTicket } from '@/services/event.service';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const purchaseSchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    const body = await request.json();
    const validation = purchaseSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const ticket = await purchaseEventTicket({
      userId: payload.sub,
      eventId: params.id,
      quantity: validation.data.quantity,
    });

    return successResponse(ticket, 'Ticket purchased successfully', undefined, 201);
  } catch (error: any) {
    console.error('Purchase ticket error:', error);
    if (error.message?.includes('not found') || error.message?.includes('not available') || error.message?.includes('not enough')) {
      return errorResponse(error.message, 400);
    }
    if (error.message?.includes('Insufficient')) {
      return errorResponse('Insufficient credits', 400);
    }
    return errorResponse('Failed to purchase ticket', 500);
  }
}
