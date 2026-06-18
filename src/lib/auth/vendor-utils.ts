import { db } from '@/lib/db';

/**
 * Get vendor ID from the authenticated user's ID (owner).
 * In the Bucr system, vendors are owned by users, so the JWT contains the user ID,
 * not the vendor ID. This utility resolves the vendor from the owner.
 */
export async function getVendorFromUserId(userId: string): Promise<{ id: string; ownerId: string } | null> {
  const vendor = await db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
    select: { id: true, ownerId: true },
  });
  return vendor;
}

/**
 * Get full vendor details from user ID
 */
export async function getVendorWithDetailsFromUserId(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
    include: {
      branches: {
        where: { deletedAt: null },
        orderBy: { isMainBranch: 'desc' },
      },
    },
  });
}
