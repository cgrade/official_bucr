import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/api-response';

// Default settings
const defaultSettings = {
  creditPurchaseRate: 100,
  minCreditPurchase: 10,
  maxCreditPurchase: 10000,
  creditExpiryMonths: 6,
  standardReservationCredits: 50,
  groupReservationCredits: 100,
  largePartyCredits: 200,
  cancellation24HoursRefund: 100,
  cancellation12HoursRefund: 50,
  noShowPenalty: 100,
  basicSubscriptionPrice: 75000,
  proSubscriptionPrice: 145000,
  premiumSubscriptionPrice: 250000,
  vendorVerificationRequired: true,
};

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

    return successResponse({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Admin update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
