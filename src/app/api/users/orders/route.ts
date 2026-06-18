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

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: payload.sub };

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    const [orders, total] = await Promise.all([
      db.takeoutOrder.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              phone: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.takeoutOrder.count({ where }),
    ]);

    return successResponse(
      orders,
      undefined,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get user orders error:', error);
    return errorResponse('Failed to get orders', 500);
  }
}
