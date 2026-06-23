import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/password';
import { getAdminContext, isSuperAdmin, resolveAdminPermissions } from '@/lib/auth/admin-rbac';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/utils/api-response';

const patchSchema = z.object({
  role: z.enum(['super_admin', 'ops_manager', 'support', 'finance', 'content', 'analyst']).optional(),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/).optional(),
});

/** PATCH /api/admin/admins/[id] — change an admin's role/permissions/password (super_admin only). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    const me = await getAdminContext(payload);
    if (!me) return unauthorizedResponse();
    if (!isSuperAdmin(me)) return forbiddenResponse('Only a super admin can manage admins');

    const validation = patchSchema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));
    const { role, permissions, password } = validation.data;

    const target = await db.admin.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!target) return notFoundResponse('Admin');

    // Don't allow removing the last super_admin's super status.
    if (target.role === 'super_admin' && role && role !== 'super_admin') {
      const supers = await db.admin.count({ where: { role: 'super_admin', deletedAt: null } });
      if (supers <= 1) return errorResponse('Cannot demote the last super admin', 400);
    }

    const data: any = {};
    if (role !== undefined) { data.role = role; data.permissions = resolveAdminPermissions(role, permissions); }
    else if (permissions !== undefined) { data.permissions = resolveAdminPermissions(target.role, permissions); }
    if (password) data.passwordHash = await hashPassword(password);

    const updated = await db.admin.update({
      where: { id: target.id },
      data,
      select: { id: true, email: true, name: true, role: true, permissions: true },
    });
    db.auditLog.create({ data: { adminId: me.id, action: 'update', resource: 'admin', resourceId: target.id, metadata: { role: updated.role } } }).catch(() => {});
    return successResponse(updated, 'Admin updated');
  } catch (error) {
    console.error('Update admin error:', error);
    return errorResponse('Failed to update admin', 500);
  }
}

/** DELETE /api/admin/admins/[id] — remove an admin (super_admin only). Soft delete. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await authenticateRequest(request);
    const me = await getAdminContext(payload);
    if (!me) return unauthorizedResponse();
    if (!isSuperAdmin(me)) return forbiddenResponse('Only a super admin can manage admins');
    if (params.id === me.id) return errorResponse('You cannot remove your own account', 400);

    const target = await db.admin.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!target) return notFoundResponse('Admin');

    if (target.role === 'super_admin') {
      const supers = await db.admin.count({ where: { role: 'super_admin', deletedAt: null } });
      if (supers <= 1) return errorResponse('Cannot remove the last super admin', 400);
    }

    await db.admin.update({ where: { id: target.id }, data: { deletedAt: new Date() } });
    db.auditLog.create({ data: { adminId: me.id, action: 'delete', resource: 'admin', resourceId: target.id, metadata: { email: target.email } } }).catch(() => {});
    return successResponse({ id: target.id }, 'Admin removed');
  } catch (error) {
    console.error('Delete admin error:', error);
    return errorResponse('Failed to remove admin', 500);
  }
}
