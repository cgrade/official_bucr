import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import { markNotificationRead } from '@/services/notification.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    await markNotificationRead(params.id, payload.sub);
    return successResponse(null, 'Notification marked as read');
  } catch (error) {
    console.error('Mark notification read error:', error);
    return errorResponse('Failed to mark notification', 500);
  }
}
