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
import { logAdminAction } from '@/lib/audit';

const adjustCreditsSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const user = await db.user.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            vendor: { select: { businessName: true } },
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            vendor: { select: { businessName: true } },
          },
        },
      },
    });

    if (!user) {
      return notFoundResponse('User');
    }

    return successResponse(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    return errorResponse('Failed to get user', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // For unban operations, we need to find users regardless of deletedAt status
    const user = await db.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return notFoundResponse('User');
    }

    // Handle credit adjustment
    if (body.adjustCredits) {
      const validation = adjustCreditsSchema.safeParse(body.adjustCredits);

      if (!validation.success) {
        const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return validationErrorResponse(errors);
      }

      const { amount, reason } = validation.data;
      const newBalance = user.creditsBalance + amount;

      if (newBalance < 0) {
        return errorResponse('Cannot reduce balance below 0', 400);
      }

      await db.$transaction([
        db.creditTransaction.create({
          data: {
            userId: params.id,
            type: 'adjustment',
            amount,
            balanceAfter: newBalance,
            description: `Admin adjustment: ${reason}`,
          },
        }),
        db.user.update({
          where: { id: params.id },
          data: { creditsBalance: newBalance },
        }),
      ]);

      // Audit log for credit adjustment
      await logAdminAction(request, {
        adminId: payload.sub,
        userId: params.id,
        action: 'adjust_credits',
        resource: 'user',
        resourceId: params.id,
        changes: { creditsBalance: { from: user.creditsBalance, to: newBalance } },
        metadata: { amount, reason },
      });

      return successResponse(
        { newBalance },
        `Credits adjusted by ${amount}. New balance: ${newBalance}`
      );
    }

    // Handle ban/unban
    if (body.banned !== undefined) {
      const updatedUser = await db.user.update({
        where: { id: params.id },
        data: { deletedAt: body.banned ? new Date() : null },
      });

      // Audit log for ban/unban
      await logAdminAction(request, {
        adminId: payload.sub,
        userId: params.id,
        action: body.banned ? 'suspend' : 'restore',
        resource: 'user',
        resourceId: params.id,
      });

      return successResponse(
        updatedUser,
        body.banned ? 'User banned' : 'User unbanned'
      );
    }

    return errorResponse('No valid action specified', 400);
  } catch (error) {
    console.error('Admin update user error:', error);
    return errorResponse('Failed to update user', 500);
  }
}

export async function DELETE(
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

    // Soft delete the user
    await db.user.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return successResponse(null, 'User deleted successfully');
  } catch (error) {
    console.error('Admin delete user error:', error);
    return errorResponse('Failed to delete user', 500);
  }
}
