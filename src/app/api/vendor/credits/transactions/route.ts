import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

/**
 * GET /api/vendor/credits/transactions
 * Get paginated transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const wallet = await db.vendorWallet.findUnique({
      where: { vendorId: vendor.id },
    });

    if (!wallet) {
      return successResponse({
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');

    const where: any = { walletId: wallet.id };
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      db.vendorCreditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vendorCreditTransaction.count({ where }),
    ]);

    return successResponse({
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        bankName: tx.bankName,
        withdrawalStatus: tx.withdrawalStatus,
        createdAt: tx.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get credit transactions error:', error);
    return errorResponse('Failed to get transactions', 500);
  }
}
