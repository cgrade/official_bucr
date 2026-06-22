import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'auth');
    if (rateLimitResponse) return rateLimitResponse;

    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await db.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    if (!user) return errorResponse('User not found', 404);

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) return errorResponse('Current password is incorrect', 400);

    const isSame = await verifyPassword(newPassword, user.passwordHash);
    if (isSame) return errorResponse('New password must be different from current password', 400);

    const newPasswordHash = await hashPassword(newPassword);
    await db.user.update({ where: { id: payload.sub }, data: { passwordHash: newPasswordHash } });

    return successResponse(null, 'Password changed successfully');
  } catch (error) {
    console.error('User change password error:', error);
    return errorResponse('Failed to change password', 500);
  }
}
