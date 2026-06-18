import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import { createEventBundle } from '@/services/event.service';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const bundleSchema = z.object({
  reservationId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    const body = await request.json();
    const validation = bundleSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const bundle = await createEventBundle({
      userId: payload.sub,
      eventId: params.id,
      reservationId: validation.data.reservationId,
    });

    return successResponse(bundle, 'Bundle created successfully', undefined, 201);
  } catch (error: any) {
    console.error('Create bundle error:', error);
    if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
      return errorResponse(error.message, 400);
    }
    if (error.message?.includes('Insufficient')) {
      return errorResponse('Insufficient credits', 400);
    }
    return errorResponse('Failed to create bundle', 500);
  }
}
