import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const ctx = await getVendorContext(payload);
    const vendor = ctx?.vendor;

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }
    if (!can(ctx, 'view_reservations')) {
      return forbiddenResponse('You do not have permission to view reservations');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const date = searchParams.get('date');
    const upcoming = searchParams.get('upcoming') === 'true';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { vendorId: vendor.id };

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    if (upcoming) {
      where.date = { gte: new Date() };
      where.status = { in: ['pending', 'confirmed'] };
    }

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              avatar: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          experience: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        skip,
        take: limit,
      }),
      db.reservation.count({ where }),
    ]);

    return successResponse(reservations, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get vendor reservations error:', error);
    return errorResponse('Failed to get reservations', 500);
  }
}
