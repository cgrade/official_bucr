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

    const bundles = await db.eventBundle.findMany({
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
        reservation: {
          select: {
            id: true,
            reference: true,
            date: true,
            time: true,
            partySize: true,
          },
        },
      },
    });

    return successResponse(bundles);
  } catch (error) {
    console.error('Get user event bundles error:', error);
    return errorResponse('Failed to get event bundles', 500);
  }
}
