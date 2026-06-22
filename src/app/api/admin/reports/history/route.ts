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
    const skip = (page - 1) * limit;
    const type = searchParams.get('type') || undefined;

    const where = type ? { type } : {};

    const [reports, total] = await Promise.all([
      db.reportHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.reportHistory.count({ where }),
    ]);

    return successResponse({
      reports: reports.map((r) => ({
        id: r.id,
        type: r.type,
        generatedAt: r.createdAt,
        generatedBy: r.generatedBy,
        parameters: r.parameters,
        status: r.status,
        fileUrl: r.fileUrl,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin get report history error:', error);
    return errorResponse('Failed to get report history', 500);
  }
}

// recordReport() helper moved to '@/lib/admin/report-history' — Next.js route
// modules may only export HTTP handlers and route config.
