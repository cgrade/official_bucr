import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const suspendSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return notFoundResponse('User');
    }

    if (user.status === 'suspended') {
      return errorResponse('User is already suspended', 400);
    }

    const body = await request.json();
    const validation = suspendSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { reason } = validation.data;

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: {
        status: 'suspended',
        suspendedReason: reason,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        suspendedReason: true,
      },
    });

    return successResponse(updatedUser, 'User suspended successfully');
  } catch (error) {
    console.error('Admin suspend user error:', error);
    return errorResponse('Failed to suspend user', 500);
  }
}
