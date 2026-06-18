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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const branchId = searchParams.get('branchId');
    const today = searchParams.get('today') === 'true';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { vendorId: vendor.id };

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const [orders, total] = await Promise.all([
      db.takeoutOrder.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.takeoutOrder.count({ where }),
    ]);

    return successResponse(orders, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    return errorResponse('Failed to get orders', 500);
  }
}
