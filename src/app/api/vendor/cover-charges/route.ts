import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || user.role !== 'vendor') return unauthorizedResponse();

    const vendor = await db.vendor.findFirst({
      where: { ownerId: user.sub, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) return forbiddenResponse('Vendor not found');

    const now = new Date();
    const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [accrued, history] = await Promise.all([
      db.coverCharge.aggregate({
        where: { vendorId: vendor.id, billingMonth: currentBillingMonth, status: 'accrued' },
        _sum: { feeCharged: true },
        _count: { id: true },
      }),
      db.coverCharge.groupBy({
        by: ['billingMonth', 'status'],
        where: { vendorId: vendor.id, status: { in: ['invoiced', 'paid'] } },
        _sum: { feeCharged: true },
        orderBy: { billingMonth: 'desc' },
        take: 6,
      }),
    ]);

    return successResponse({
      currentMonth: {
        billingMonth: currentBillingMonth,
        accruedNgn:  accrued._sum.feeCharged ?? 0,
        checkIns:    accrued._count.id,
      },
      history,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to fetch cover charges', 500);
  }
}
