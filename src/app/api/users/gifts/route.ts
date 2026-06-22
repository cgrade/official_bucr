import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getUserGifts } from '@/services/gift.service';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || user.role !== 'user') return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page  = Number(searchParams.get('page')  ?? 1);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const result = await getUserGifts(user.sub, { page, limit });
    return successResponse(result);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to fetch gifts', 500);
  }
}
