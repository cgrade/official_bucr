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
    if (!adminCan(__admin, 'documents.view')) return forbiddenResponse('Insufficient permissions for this resource');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'pending';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status !== 'all') {
      where.status = status;
    }

    const [documents, total] = await Promise.all([
      db.vendorDocument.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              email: true,
            },
          },
          reviewedBy: {
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
      db.vendorDocument.count({ where }),
    ]);

    return successResponse(documents, undefined, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin get documents error:', error);
    return errorResponse('Failed to get documents', 500);
  }
}
