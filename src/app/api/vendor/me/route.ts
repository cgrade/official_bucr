import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/api-response';
import { deleteImage } from '@/lib/upload';

/**
 * DELETE /api/vendor/me — Vendor account deletion (NDPA 2023)
 * Anonymises PII while retaining financial records.
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload || payload.role !== 'vendor') return unauthorizedResponse();

    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      select: { id: true, logo: true, email: true },
    });
    if (!vendor) return errorResponse('Vendor not found', 404);

    if (vendor.logo) deleteImage(vendor.logo).catch(() => {});

    const now = new Date();
    const anonEmail = `deleted_${vendor.id}@bucr.deleted`;

    await db.$transaction([
      db.vendor.update({
        where: { id: vendor.id },
        data: {
          businessName: 'Deleted Vendor',
          email:        anonEmail,
          phone:        '', // required field — cannot be null
          logo:         null,
          website:      null,
          description:  null,
          deletedAt:    now,
          verificationStatus: 'rejected' as any,
        },
      }),
      db.user.update({
        where: { id: payload.sub },
        data: {
          name:     'Deleted Vendor User',
          email:    anonEmail,
          phone:    null,
          avatar:   null,
          deletedAt: now,
          status:   'inactive' as any,
        },
      }),
    ]);

    return successResponse(null, 'Vendor account deleted and personal data anonymised (NDPA 2023).');
  } catch (error) {
    console.error('Vendor delete-account error:', error);
    return errorResponse('Failed to delete account', 500);
  }
}
