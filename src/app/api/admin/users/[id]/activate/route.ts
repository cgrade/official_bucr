import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

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

    if (user.status === 'active') {
      return errorResponse('User is already active', 400);
    }

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: {
        status: 'active',
        suspendedReason: null,
        deletedAt: null, // Also unban if banned
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    return successResponse(updatedUser, 'User activated successfully');
  } catch (error) {
    console.error('Admin activate user error:', error);
    return errorResponse('Failed to activate user', 500);
  }
}
