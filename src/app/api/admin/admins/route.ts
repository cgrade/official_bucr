import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/password';
import {
  getAdminContext, isSuperAdmin, resolveAdminPermissions, ADMIN_ROLES,
  ADMIN_PERMISSIONS, ADMIN_ROLE_PRESETS,
} from '@/lib/auth/admin-rbac';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/utils/api-response';

/** GET /api/admin/admins — list admins + the role/permission catalog (super_admin only). */
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    const me = await getAdminContext(payload);
    if (!me) return unauthorizedResponse();
    if (!isSuperAdmin(me)) return forbiddenResponse('Only a super admin can manage admins');

    const admins = await db.admin.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, name: true, role: true, permissions: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return successResponse({ admins, roles: ADMIN_ROLES, permissions: ADMIN_PERMISSIONS, rolePresets: ADMIN_ROLE_PRESETS, meId: me.id });
  } catch (error) {
    console.error('List admins error:', error);
    return errorResponse('Failed to load admins', 500);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['super_admin', 'ops_manager', 'support', 'finance', 'content', 'analyst']),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(8, 'Min 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number'),
});

/** POST /api/admin/admins — create an admin with a role + permissions (super_admin only). */
export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    const me = await getAdminContext(payload);
    if (!me) return unauthorizedResponse();
    if (!isSuperAdmin(me)) return forbiddenResponse('Only a super admin can create admins');

    const validation = createSchema.safeParse(await request.json());
    if (!validation.success) return validationErrorResponse(validation.error.errors.map((e) => e.message));
    const { email, name, role, permissions, password } = validation.data;

    const existing = await db.admin.findUnique({ where: { email } });
    if (existing) return errorResponse('An admin with that email already exists', 409);

    const admin = await db.admin.create({
      data: { email, name, role, permissions: resolveAdminPermissions(role, permissions), passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, role: true, permissions: true, createdAt: true },
    });

    db.auditLog.create({ data: { adminId: me.id, action: 'create', resource: 'admin', resourceId: admin.id, metadata: { email, role } } }).catch(() => {});
    return successResponse(admin, 'Admin created');
  } catch (error) {
    console.error('Create admin error:', error);
    return errorResponse('Failed to create admin', 500);
  }
}
