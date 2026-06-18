import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.creditTransaction.count({ where }),
    ]);

    return successResponse({
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        userId: tx.userId,
        userName: tx.user?.name,
        userEmail: tx.user?.email,
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
    console.error('Admin credits transactions error:', error);
    return errorResponse('Failed to get transactions', 500);
  }
}
