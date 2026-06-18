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

async function getOrCreateWallet(vendorId: string) {
  let wallet = await db.vendorWallet.findUnique({
    where: { vendorId },
  });

  if (!wallet) {
    wallet = await db.vendorWallet.create({
      data: { vendorId },
    });
  }

  return wallet;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const vendor = await db.vendor.findUnique({
      where: { id: params.id, deletedAt: null },
      select: { id: true, businessName: true, email: true },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    const body = await request.json();
    const validation = adjustCreditsSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { amount, reason } = validation.data;
    
    const wallet = await getOrCreateWallet(params.id);
    const newBalance = wallet.balance + amount;

    if (newBalance < 0) {
      return errorResponse('Cannot reduce balance below 0', 400);
    }

    const [transaction, updatedWallet] = await db.$transaction([
      db.vendorCreditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'adjustment',
          amount,
          balanceAfter: newBalance,
          description: `Admin adjustment: ${reason}`,
        },
      }),
      db.vendorWallet.update({
        where: { id: wallet.id },
        data: { 
          balance: newBalance,
          totalEarned: amount > 0 ? { increment: amount } : undefined,
          totalSpent: amount < 0 ? { increment: Math.abs(amount) } : undefined,
        },
      }),
    ]);

    return successResponse(
      {
        vendor,
        wallet: {
          id: updatedWallet.id,
          balance: updatedWallet.balance,
        },
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          balanceAfter: transaction.balanceAfter,
        },
      },
      `Vendor credits adjusted by ${amount}. New balance: ${newBalance}`
    );
  } catch (error) {
    console.error('Admin adjust vendor credits error:', error);
    return errorResponse('Failed to adjust vendor credits', 500);
  }
}
