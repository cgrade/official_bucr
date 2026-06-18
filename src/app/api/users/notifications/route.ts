import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import {
  getUserNotifications,
  markAllNotificationsRead,
} from '@/services/notification.service';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';

    const result = await getUserNotifications(payload.sub, { page, limit, unreadOnly });
    return successResponse(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse('Failed to get notifications', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    await markAllNotificationsRead(payload.sub);
    return successResponse(null, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark all read error:', error);
    return errorResponse('Failed to mark notifications', 500);
  }
}
