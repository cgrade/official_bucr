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

/**
 * GET /api/vendor/credits
 * Get vendor wallet balance and summary
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

    const wallet = await getOrCreateWallet(vendor.id);

    // Get recent transactions
    const recentTransactions = await db.vendorCreditTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get transaction summary by type (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactionSummary = await db.vendorCreditTransaction.groupBy({
      by: ['type'],
      where: {
        walletId: wallet.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: true,
    });

    return successResponse({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        totalWithdrawn: wallet.totalWithdrawn,
        pendingWithdrawal: wallet.pendingWithdrawal,
      },
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        createdAt: tx.createdAt,
      })),
      summary: {
        last30Days: transactionSummary.map(s => ({
          type: s.type,
          total: s._sum.amount || 0,
          count: s._count,
        })),
      },
    });
  } catch (error) {
    console.error('Get vendor credits error:', error);
    return errorResponse('Failed to get credits', 500);
  }
}
