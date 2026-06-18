import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { getCreditHistory, getExpiringCredits } from '@/services/credit.service';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get user's current balance
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { creditsBalance: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get credit history
    const { transactions, total } = await getCreditHistory(payload.sub, { page, limit });

    // Get expiring credits (next 30 days)
    const expiringCredits = await getExpiringCredits(payload.sub, 30);
    const totalExpiring = expiringCredits.reduce((sum, t) => sum + t.amount, 0);

    return successResponse(
      {
        balance: user.creditsBalance,
        balanceValue: user.creditsBalance * config.credits.valueNgn,
        expiringIn30Days: totalExpiring,
        expiringValue: totalExpiring * config.credits.valueNgn,
        transactions,
      },
      undefined,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get credits error:', error);
    return errorResponse('Failed to get credits', 500);
  }
}
