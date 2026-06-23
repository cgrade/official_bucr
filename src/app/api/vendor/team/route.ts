import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
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
    // Staff can see the roster; only owner can mutate (enforced on invite/delete).
    if (!can(ctx, 'view_dashboard')) return forbiddenResponse('Insufficient permissions');

    const staff = await db.vendorStaff.findMany({
      where: { vendorId: ctx.vendor.id, deletedAt: null },
      select: { id: true, email: true, name: true, role: true, status: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse({ staff, canManage: can(ctx, 'manage_staff') });
  } catch (error) {
    console.error('List team error:', error);
    return errorResponse('Failed to load team', 500);
  }
}
