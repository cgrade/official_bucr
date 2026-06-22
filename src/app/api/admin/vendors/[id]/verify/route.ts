import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { syncVendorAchievements } from '@/services/achievement.service';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const verifySchema = z.object({
  status: z.enum(['approved', 'rejected']).optional(),
  rejectionReason: z.string().optional(),
}).refine((data) => {
  if (data.status === 'rejected' && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required when rejecting a vendor',
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    const vendor = await db.vendor.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        documents: true,
      },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    const body = await request.json().catch(() => ({}));
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { status = 'approved', rejectionReason } = validation.data;

    // Update vendor verification status
    const updatedVendor = await db.vendor.update({
      where: { id: params.id },
      data: {
        verificationStatus: status,
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        verificationStatus: true,
      },
    });

    // If approved, mark all pending documents as verified
    if (status === 'approved') {
      await db.vendorDocument.updateMany({
        where: {
          vendorId: params.id,
          status: 'pending',
        },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedById: payload.sub,
        },
      });
    } else if (status === 'rejected') {
      // Mark documents as rejected with reason
      await db.vendorDocument.updateMany({
        where: {
          vendorId: params.id,
          status: 'pending',
        },
        data: {
          status: 'rejected',
          rejectionReason: rejectionReason,
        },
      });
    }

    // Sync achievements fire-and-forget (awards/revokes Verified Business badge immediately)
    syncVendorAchievements(params.id).catch(() => {});

    return successResponse(
      updatedVendor,
      status === 'approved' ? 'Vendor verified successfully' : 'Vendor verification rejected'
    );
  } catch (error) {
    console.error('Admin verify vendor error:', error);
    return errorResponse('Failed to verify vendor', 500);
  }
}
