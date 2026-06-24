import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getAdminContext, adminCan } from '@/lib/auth/admin-rbac';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/**
 * GET /api/admin/reviews?reported=true — list reviews for moderation.
 * Vendors report suspicious/false reviews; support/ops resolve them here.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'admin') return unauthorizedResponse();
    const me = await getAdminContext(payload);
    if (!adminCan(me, 'reviews.view')) return forbiddenResponse('Insufficient permissions for this resource');

    const { searchParams } = new URL(request.url);
    const reportedOnly = searchParams.get('reported') !== 'false';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    const where = reportedOnly ? { isReported: true } : {};
    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { reportedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true } },
          vendor: { select: { id: true, businessName: true, slug: true } },
        },
      }),
      db.review.count({ where }),
    ]);

    return successResponse({ reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Admin list reviews error:', error);
    return errorResponse('Failed to load reviews', 500);
  }
}
