import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import { createGift } from '@/services/gift.service';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';
import { z } from 'zod';

const createGiftSchema = z.object({
  creditAmount: z.number().int().positive(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().min(7).optional(),
  message: z.string().max(280).optional(),
}).refine((d) => d.recipientEmail || d.recipientPhone, {
  message: 'Provide recipientEmail or recipientPhone',
});

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, 'payment');
    if (limited) return limited;

    const user = await authenticateRequest(request);
    if (!user || user.role !== 'user') return unauthorizedResponse();

    const body = await request.json();
    const parsed = createGiftSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.message, 400);

    const gift = await createGift({ senderId: user.sub, ...parsed.data });
    return successResponse(gift, 'Gift sent', undefined, 201);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to send gift', 400);
  }
}
