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
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const vendorId = searchParams.get('vendorId');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { branch: { vendor: { businessName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.orderType = type;
    }

    if (vendorId) {
      where.branch = { vendorId };
    }

    const [orders, total] = await Promise.all([
      db.takeoutOrder.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          vendor: {
            select: { id: true, businessName: true },
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

    return successResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get orders error:', error);
    return errorResponse('Failed to get orders', 500);
  }
}
