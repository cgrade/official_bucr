import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';
import {
  DEFAULT_OPERATIONAL_SETTINGS,
  invalidateSystemSettingsCache,
} from '@/lib/config/system-settings';

// Admin-tunable OPERATIONAL defaults. Economic values are NOT here — they live
// in the legally-reviewed ECONOMICS config and are surfaced read-only.
const defaultSettings = { ...DEFAULT_OPERATIONAL_SETTINGS };

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    // Get all settings from database
    const settings = await db.systemSetting.findMany();
    
    // Merge with defaults
    const settingsMap: Record<string, any> = { ...defaultSettings };
    settings.forEach((setting) => {
      try {
        settingsMap[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsMap[setting.key] = setting.value;
      }
    });

    return successResponse(settingsMap);
  } catch (error) {
    console.error('Admin get settings error:', error);
    // Return defaults if table doesn't exist
    return successResponse(defaultSettings);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    // Check for super_admin role for settings updates
    const admin = await db.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || (admin.role !== 'super_admin' && !admin.permissions?.includes('settings.update'))) {
      return errorResponse('Insufficient permissions', 403);
    }

    const body = await request.json();

    // Update each setting
    const updates = Object.entries(body).map(([key, value]) => 
      db.systemSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(value), updatedAt: new Date() },
        create: { key, value: JSON.stringify(value) },
      })
    );

    await db.$transaction(updates);

    // Drop the cache so the new values take effect on the next request.
    invalidateSystemSettingsCache();

    return successResponse({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Admin update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
