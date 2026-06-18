import { NextRequest } from 'next/server';
import { z } from 'zod';
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
    const search = searchParams.get('search');
    const vipOnly = searchParams.get('vipOnly') === 'true';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { vendorId: vendor.id };

    if (vipOnly) {
      where.isVip = true;
    }

    // Search by user name or tags
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { tags: { hasSome: [search] } },
      ];
    }

    const [profiles, total] = await Promise.all([
      db.guestProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              dietaryRestrictions: true,
              specialOccasions: true,
            },
          },
        },
        orderBy: [{ isVip: 'desc' }, { visitCount: 'desc' }],
        skip,
        take: limit,
      }),
      db.guestProfile.count({ where }),
    ]);

    return successResponse(profiles, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get guest profiles error:', error);
    return errorResponse('Failed to get guest profiles', 500);
  }
}
