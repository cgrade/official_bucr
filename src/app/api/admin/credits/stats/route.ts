import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getAdminContext, adminCan } from '@/lib/auth/admin-rbac';
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }
    const __admin = await getAdminContext(payload);
    if (!adminCan(__admin, 'credits.view')) return forbiddenResponse('Insufficient permissions for this resource');

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const [
      userCredits,
      vendorCredits,
      todayPurchases,
    ] = await Promise.all([
      db.user.aggregate({ _sum: { creditsBalance: true } }),
      db.vendorWallet.aggregate({ _sum: { balance: true } }),
      db.creditTransaction.count({
        where: {
          type: 'purchase',
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    const totalUserCredits = userCredits._sum.creditsBalance || 0;
    const totalVendorCredits = vendorCredits._sum.balance || 0;

    return successResponse({
      totalCreditsInCirculation: totalUserCredits + totalVendorCredits,
      totalUserCredits,
      totalVendorCredits,
      todayPurchases,
    });
  } catch (error) {
    console.error('Admin credits stats error:', error);
    return errorResponse('Failed to get credits stats', 500);
  }
}
