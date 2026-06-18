import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

// Default settings for fallback
const defaultSettings: Record<string, unknown> = {
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

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const { key } = params;

    // Try to get from database
    const setting = await db.systemSetting.findUnique({
      where: { key },
    });

    if (setting) {
      try {
        return successResponse({
          key,
          value: JSON.parse(setting.value),
          updatedAt: setting.updatedAt,
        });
      } catch {
        return successResponse({
          key,
          value: setting.value,
          updatedAt: setting.updatedAt,
        });
      }
    }

    // Check if it's a default setting
    if (key in defaultSettings) {
      return successResponse({
        key,
        value: defaultSettings[key],
        isDefault: true,
      });
    }

    return notFoundResponse('Setting');
  } catch (error) {
    console.error('Admin get setting error:', error);
    return errorResponse('Failed to get setting', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
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

    const { key } = params;
    const body = await request.json();
    const { value } = body;

    if (value === undefined) {
      return errorResponse('Value is required', 400);
    }

    const setting = await db.systemSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value), updatedAt: new Date() },
      create: { key, value: JSON.stringify(value) },
    });

    return successResponse({
      key: setting.key,
      value: JSON.parse(setting.value),
      updatedAt: setting.updatedAt,
    }, 'Setting updated successfully');
  } catch (error) {
    console.error('Admin update setting error:', error);
    return errorResponse('Failed to update setting', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    // Check for super_admin role
    const admin = await db.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || admin.role !== 'super_admin') {
      return errorResponse('Insufficient permissions', 403);
    }

    const { key } = params;

    await db.systemSetting.delete({
      where: { key },
    }).catch(() => null);

    return successResponse(null, 'Setting deleted (will use default)');
  } catch (error) {
    console.error('Admin delete setting error:', error);
    return errorResponse('Failed to delete setting', 500);
  }
}
