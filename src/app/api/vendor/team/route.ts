import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can, VENDOR_DELEGATABLE_PERMISSIONS, VENDOR_ROLE_PRESETS } from '@/lib/auth/vendor-context';
import { ECONOMICS } from '@/lib/config/economics';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/utils/api-response';

/**
 * GET /api/vendor/team — list the vendor's staff (owner/manager).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();

    const ctx = await getVendorContext(payload);
    if (!ctx) return forbiddenResponse('No vendor account found');
    // Team management is owner-only.
    if (!can(ctx, 'manage_staff')) return forbiddenResponse('Only the account owner can manage staff');

    const staff = await db.vendorStaff.findMany({
      where: { vendorId: ctx.vendor.id, deletedAt: null },
      select: { id: true, email: true, name: true, role: true, permissions: true, status: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const seatLimit = ECONOMICS.VENDOR_STAFF_SEATS[ctx.vendor.subscriptionTier as string] ?? 0;
    return successResponse({
      staff,
      canManage: can(ctx, 'manage_staff'),
      seatLimit,
      seatsUsed: staff.length,
      delegatablePermissions: VENDOR_DELEGATABLE_PERMISSIONS,
      rolePresets: VENDOR_ROLE_PRESETS,
    });
  } catch (error) {
    console.error('List team error:', error);
    return errorResponse('Failed to load team', 500);
  }
}
