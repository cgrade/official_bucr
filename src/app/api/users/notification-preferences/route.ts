import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';
import {
  NOTIFICATION_CATEGORIES,
  DEFAULT_NOTIFICATION_PREFS,
  resolvePreferences,
} from '@/lib/notifications/preferences';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { notificationPreferences: true },
    });

    if (!user) return errorResponse('User not found', 404);

    return successResponse(resolvePreferences(user.notificationPreferences));
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return errorResponse('Failed to get preferences', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) return unauthorizedResponse();

    const body = await request.json();

    // Validate — only allow known keys
    const update: Record<string, boolean> = {};
    for (const key of NOTIFICATION_CATEGORIES) {
      if (key in body && typeof body[key] === 'boolean') {
        update[key] = body[key];
      }
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { notificationPreferences: true },
    });
    if (!user) return errorResponse('User not found', 404);

    const merged = {
      ...resolvePreferences(user.notificationPreferences),
      ...update,
    };

    await db.user.update({
      where: { id: payload.sub },
      data: { notificationPreferences: merged },
    });

    return successResponse(merged, 'Preferences updated');
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return errorResponse('Failed to update preferences', 500);
  }
}
