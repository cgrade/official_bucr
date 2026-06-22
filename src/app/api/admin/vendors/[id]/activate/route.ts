import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import { syncVendorAchievements } from '@/services/achievement.service';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse();
    }

    // Find vendor regardless of deletedAt status for reactivation
    const vendor = await db.vendor.findUnique({
      where: { id: params.id },
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    if (vendor.verificationStatus === 'approved' && !vendor.deletedAt) {
      return errorResponse('Vendor is already active', 400);
    }

    const updatedVendor = await db.vendor.update({
      where: { id: params.id },
      data: {
        verificationStatus: 'approved',
        deletedAt: null, // Remove soft delete
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        verificationStatus: true,
      },
    });

    // Sync achievements based on real vendor state (fire-and-forget)
    syncVendorAchievements(params.id).catch(() => {});

    return successResponse(updatedVendor, 'Vendor activated successfully');
  } catch (error) {
    console.error('Admin activate vendor error:', error);
    return errorResponse('Failed to activate vendor', 500);
  }
}
