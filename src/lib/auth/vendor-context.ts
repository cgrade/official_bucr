import { db } from '@/lib/db';
import type { JWTPayload } from '@/types';

export type VendorActorRole = 'owner' | 'manager' | 'staff';

export interface VendorContext {
  vendor: any;
  /** 'owner' for the account owner, otherwise the staff member's role. */
  actorRole: VendorActorRole;
  isOwner: boolean;
  /** Set only when the actor is a staff member. */
  staffId?: string;
}

/**
 * Resolve the vendor a request is acting on, for BOTH the owner and invited staff.
 *
 * - Owner tokens (role='vendor', no staff claims) → vendor by ownerId.
 * - Staff tokens (carry vendorId + staffId + staffRole) → that vendor, after
 *   re-checking the staff row is still active (so disabling/removing staff takes
 *   effect immediately, not only at next login).
 *
 * Returns null if no active vendor/staff is found (caller returns 403/404).
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

  // Staff member
  if (payload.staffId && payload.vendorId) {
    const staff = await db.vendorStaff.findFirst({
      where: { id: payload.staffId, vendorId: payload.vendorId, status: 'active', deletedAt: null },
      select: { id: true, role: true },
    });
    if (!staff) return null;
    const vendor = await db.vendor.findFirst({ where: { id: payload.vendorId, deletedAt: null }, ...query });
    if (!vendor) return null;
    return { vendor, actorRole: staff.role as VendorActorRole, isOwner: false, staffId: staff.id };
  }

  // Owner
  const vendor = await db.vendor.findFirst({ where: { ownerId: payload.sub, deletedAt: null }, ...query });
  if (!vendor) return null;
  return { vendor, actorRole: 'owner', isOwner: true };
}

/**
 * Capability matrix — least privilege.
 *  - staff   : floor operations only (check in guests, see bookings, 86 a dish).
 *  - manager : everything operational + content, but NOT money/identity/team.
 *  - owner   : everything (money, subscription, bank, team, delete).
 * Sensitive endpoints resolve the vendor via getVendorContext and reject anyone
 * whose actorRole lacks the capability. Endpoints NOT wired to getVendorContext
 * stay owner-only by default (a staff token can't resolve a vendor there).
 */
export const VENDOR_CAPABILITIES: Record<string, VendorActorRole[]> = {
  check_in:               ['owner', 'manager', 'staff'],
  view_reservations:      ['owner', 'manager', 'staff'],
  view_dashboard:         ['owner', 'manager', 'staff'],
  toggle_menu_availability: ['owner', 'manager', 'staff'],
  manage_menu:            ['owner', 'manager'],
  manage_reservations:    ['owner', 'manager'],
  view_analytics:         ['owner', 'manager'],
  manage_offers:          ['owner', 'manager'],
  respond_reviews:        ['owner', 'manager'],
  manage_experiences:     ['owner', 'manager'],
  manage_gallery:         ['owner', 'manager'],
  // Owner-only (money / identity / team)
  manage_billing:         ['owner'],
  manage_bank:            ['owner'],
  manage_subscription:    ['owner'],
  spend_credits:          ['owner'],
  manage_staff:           ['owner'],
  manage_settings:        ['owner'],
  delete_account:         ['owner'],
};

export function can(ctx: VendorContext | null, capability: keyof typeof VENDOR_CAPABILITIES): boolean {
  if (!ctx) return false;
  const allowed = VENDOR_CAPABILITIES[capability];
  return !!allowed && allowed.includes(ctx.actorRole);
}
