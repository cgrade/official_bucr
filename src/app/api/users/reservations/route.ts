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
    const upcoming = searchParams.get('upcoming') === 'true';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: payload.sub };

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.date = { gte: new Date() };
      where.status = { in: ['pending', 'confirmed'] };
    }

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              logo: true,
              galleryImages: {
                take: 1,
                orderBy: { sortOrder: 'asc' },
                select: { url: true },
              },
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
          experience: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        skip,
        take: limit,
      }),
      db.reservation.count({ where }),
    ]);

    return successResponse(
      reservations,
      undefined,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error('Get user reservations error:', error);
    return errorResponse('Failed to get reservations', 500);
  }
}
