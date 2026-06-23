import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { getVendorContext, can } from '@/lib/auth/vendor-context';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/utils/api-response';

const patchSchema = z.object({
  role: z.enum(['manager', 'staff']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

/** PATCH /api/vendor/team/[id] — change a staff member's role or enable/disable (owner only). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'manage_staff')) return forbiddenResponse('Only the account owner can manage staff');

    const validation = patchSchema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));

    const staff = await db.vendorStaff.findFirst({ where: { id: params.id, vendorId: ctx.vendor.id, deletedAt: null } });
    if (!staff) return notFoundResponse('Staff member');

    const updated = await db.vendorStaff.update({
      where: { id: staff.id },
      data: validation.data,
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    return successResponse(updated, 'Team member updated');
  } catch (error) {
    console.error('Update team error:', error);
    return errorResponse('Failed to update team member', 500);
  }
}

/** DELETE /api/vendor/team/[id] — remove a staff member (owner only). Soft delete. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();
    const ctx = await getVendorContext(payload);
    if (!ctx) return forbiddenResponse('No vendor account found');
    if (!can(ctx, 'manage_staff')) return forbiddenResponse('Only the account owner can manage staff');

    const staff = await db.vendorStaff.findFirst({ where: { id: params.id, vendorId: ctx.vendor.id, deletedAt: null } });
    if (!staff) return notFoundResponse('Staff member');

    await db.vendorStaff.update({
      where: { id: staff.id },
      data: { deletedAt: new Date(), status: 'disabled', inviteToken: null },
    });
    return successResponse({ id: staff.id }, 'Team member removed');
  } catch (error) {
    console.error('Remove team error:', error);
    return errorResponse('Failed to remove team member', 500);
  }
}
