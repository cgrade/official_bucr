import { db } from '@/lib/db';
import type { JWTPayload } from '@/types';

/**
 * Admin RBAC. `super_admin` has full system access and is the only role that can
 * manage other admins. Every other role gets a least-privilege permission set.
 * Permissions are `resource.action`; `resource.*` grants all actions on a resource.
 */
export const ADMIN_PERMISSIONS = [
  'admins.manage',       // create/edit/remove admins, set roles — super_admin only
  'settings.update',     // platform/economic settings
  'vendors.view', 'vendors.manage',
  'users.view', 'users.manage',
  'reservations.view', 'reservations.manage',
  'credits.view', 'credits.adjust',
  'documents.view', 'documents.verify',
  'reviews.view', 'reviews.moderate',
  'featured.view', 'featured.manage',
  'revenue.view',        // platform revenue / finance
  'reports.view', 'reports.generate',
  'analytics.view',
  'notifications.send',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type AdminRole = 'super_admin' | 'ops_manager' | 'support' | 'finance' | 'content' | 'analyst';

/** Default permission set per role (super_admin bypasses all checks). */
export const ADMIN_ROLE_PRESETS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  ops_manager: [
    'vendors.view', 'vendors.manage', 'reservations.view', 'reservations.manage',
    'documents.view', 'documents.verify', 'reviews.view', 'reviews.moderate',
    'featured.view', 'featured.manage', 'users.view', 'analytics.view', 'notifications.send',
  ],
  support: [
    'users.view', 'users.manage', 'reservations.view', 'vendors.view',
    'reviews.view', 'reviews.moderate', 'credits.view', 'credits.adjust', 'notifications.send',
  ],
  finance: ['revenue.view', 'reports.view', 'reports.generate', 'credits.view', 'analytics.view'],
  content: ['featured.view', 'featured.manage', 'analytics.view'],
  analyst: ['vendors.view', 'users.view', 'reservations.view', 'reviews.view', 'revenue.view', 'reports.view', 'analytics.view'],
};

export interface AdminCtx {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

/** Load the admin behind an admin token (null if not a valid, active admin). */
export async function getAdminContext(payload: JWTPayload | null): Promise<AdminCtx | null> {
  if (!payload || payload.role !== 'admin') return null;
  const admin = await db.admin.findUnique({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, email: true, name: true, role: true, permissions: true },
  });
  return admin as AdminCtx | null;
}

export function isSuperAdmin(admin: AdminCtx | null): boolean {
  return !!admin && (admin.role === 'super_admin' || admin.permissions?.includes('*'));
}

/** Does this admin hold a permission? super_admin and `*` grant everything; `resource.*` grants the resource. */
export function adminCan(admin: AdminCtx | null, permission: AdminPermission | string): boolean {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;
  const perms = admin.permissions ?? [];
  if (perms.includes(permission)) return true;
  const resource = permission.split('.')[0];
  return perms.includes(`${resource}.*`);
}

/** Effective permissions for display (super_admin → the full catalog). */
export function effectivePermissions(admin: AdminCtx): string[] {
  return isSuperAdmin(admin) ? [...ADMIN_PERMISSIONS] : (admin.permissions ?? []);
}

/**
 * Resolve the permission set to store for a (role, explicit-permissions) pair.
 *  - super_admin → ['*'] (full access)
 *  - otherwise → explicit list if given (filtered to the catalog), else the role preset.
 */
export function resolveAdminPermissions(role: string, explicit?: unknown): string[] {
  if (role === 'super_admin') return ['*'];
  const catalog = new Set(ADMIN_PERMISSIONS as readonly string[]);
  if (Array.isArray(explicit)) {
    return [...new Set(explicit.filter((p) => typeof p === 'string' && catalog.has(p)))];
  }
  return ADMIN_ROLE_PRESETS[role as AdminRole] ?? [];
}

export const ADMIN_ROLES: AdminRole[] = ['super_admin', 'ops_manager', 'support', 'finance', 'content', 'analyst'];
