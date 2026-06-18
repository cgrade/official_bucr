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
    if (!payload) return unauthorizedResponse();

    const tickets = await db.eventTicket.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            endDate: true,
            location: true,
            city: true,
            category: true,
            images: true,
            vendor: {
              select: { id: true, businessName: true, logo: true },
            },
          },
        },
      },
    });

    return successResponse(tickets);
  } catch (error) {
    console.error('Get user event tickets error:', error);
    return errorResponse('Failed to get event tickets', 500);
  }
}
