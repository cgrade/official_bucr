import { db } from '@/lib/db';
import type { JWTPayload } from '@/types';

export type VendorActorRole = 'owner' | 'manager' | 'staff';

export interface VendorContext {
  vendor: any;
  /** 'owner' for the account owner, otherwise the staff member's role label. */
  actorRole: VendorActorRole;
  isOwner: boolean;
  /** Effective granular permissions for a staff actor (empty for owner — owner can do all). */
  permissions: string[];
  staffId?: string;
}

/**
 * Permissions an owner MAY delegate to staff — all strictly within the owner's
 * own operational privileges (no money, identity, or team management).
 */
export const VENDOR_DELEGATABLE_PERMISSIONS = [
  'check_in',
  'cancel_reservation',
  'modify_reservation',
  'view_reservations',
  'toggle_menu_availability',
  'manage_menu',
  'respond_reviews',
  'manage_offers',
  'view_analytics',
  'manage_experiences',
  'manage_gallery',
] as const;

export type VendorPermission = (typeof VENDOR_DELEGATABLE_PERMISSIONS)[number];

/** Actions only the owner can ever perform — never delegatable to staff. */
export const VENDOR_OWNER_ONLY = [
  'manage_staff',
  'manage_billing',
  'manage_bank',
  'manage_subscription',
  'spend_credits',
  'manage_settings',
  'delete_account',
] as const;

/** Convenience presets the UI can offer when assigning a role. */
export const VENDOR_ROLE_PRESETS: Record<'manager' | 'staff', string[]> = {
  manager: [...VENDOR_DELEGATABLE_PERMISSIONS],
  staff: ['check_in', 'view_reservations', 'toggle_menu_availability'],
};

/** Keep only valid, delegatable permissions (drop anything owner-only or unknown). */
export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set(VENDOR_DELEGATABLE_PERMISSIONS as readonly string[]);
  return [...new Set(input.filter((p) => typeof p === 'string' && set.has(p)))];
}

/**
 * Resolve the vendor a request acts on, for BOTH the owner and invited staff.
 * Staff rows are re-checked as active so disable/remove takes effect immediately.
 * Returns null if no active vendor/staff is found.
 */
export async function getVendorContext(
  payload: JWTPayload | null,
  options?: { include?: any; select?: any },
): Promise<VendorContext | null> {
  if (!payload || payload.role !== 'vendor') return null;

  const query: any = options?.select
    ? { select: options.select }
    : options?.include
      ? { include: options.include }
      : {};

  if (payload.staffId && payload.vendorId) {
    const staff = await db.vendorStaff.findFirst({
      where: { id: payload.staffId, vendorId: payload.vendorId, status: 'active', deletedAt: null },
      select: { id: true, role: true, permissions: true },
    });
    if (!staff) return null;
    const vendor = await db.vendor.findFirst({ where: { id: payload.vendorId, deletedAt: null }, ...query });
    if (!vendor) return null;
    return {
      vendor,
      actorRole: staff.role as VendorActorRole,
      isOwner: false,
      permissions: sanitizePermissions(staff.permissions),
      staffId: staff.id,
    };
  }

  const vendor = await db.vendor.findFirst({ where: { ownerId: payload.sub, deletedAt: null }, ...query });
  if (!vendor) return null;
  return { vendor, actorRole: 'owner', isOwner: true, permissions: [] };
}

/**
 * Authorization check.
 *  - Owner can do everything (all delegatable + all owner-only).
 *  - Staff can do a delegatable action only if it's in their granted permissions.
 *  - Owner-only actions are never available to staff.
 */
export function can(ctx: VendorContext | null, action: string): boolean {
  if (!ctx) return false;
  if (ctx.isOwner) return true;
  if ((VENDOR_OWNER_ONLY as readonly string[]).includes(action)) return false;
  return ctx.permissions.includes(action);
}
