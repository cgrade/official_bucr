import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { claimGift } from '@/services/gift.service';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(_request);
    if (!user || user.role !== 'user') return unauthorizedResponse();

    const result = await claimGift(params.id, user.sub);
    return successResponse(result, 'Gift claimed successfully');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to claim gift', 400);
  }
}
