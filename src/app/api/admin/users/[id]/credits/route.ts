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

const adjustCreditsSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1, 'Reason is required'),
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
      select: { id: true, creditsBalance: true, name: true, email: true },
    });

    if (!user) {
      return notFoundResponse('User');
    }

    const body = await request.json();
    const validation = adjustCreditsSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { amount, reason } = validation.data;
    const newBalance = user.creditsBalance + amount;

    if (newBalance < 0) {
      return errorResponse('Cannot reduce balance below 0', 400);
    }

    const [transaction, updatedUser] = await db.$transaction([
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
        select: {
          id: true,
          email: true,
          name: true,
          creditsBalance: true,
        },
      }),
    ]);

    return successResponse(
      {
        user: updatedUser,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          balanceAfter: transaction.balanceAfter,
        },
      },
      `Credits adjusted by ${amount}. New balance: ${newBalance}`
    );
  } catch (error) {
    console.error('Admin adjust user credits error:', error);
    return errorResponse('Failed to adjust credits', 500);
  }
}
