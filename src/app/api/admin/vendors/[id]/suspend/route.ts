import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

const suspendSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
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
    });

    if (!vendor) {
      return notFoundResponse('Vendor');
    }

    if (vendor.verificationStatus === 'rejected' && !vendor.deletedAt) {
      return errorResponse('Vendor is already suspended', 400);
    }

    const body = await request.json();
    const validation = suspendSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { reason } = validation.data;

    const updatedVendor = await db.vendor.update({
      where: { id: params.id },
      data: {
        verificationStatus: 'rejected',
        // Do NOT set deletedAt — that would hide the vendor from all admin queries
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        verificationStatus: true,
      },
    });

    return successResponse({ ...updatedVendor, suspendedReason: reason }, 'Vendor suspended successfully');
  } catch (error) {
    console.error('Admin suspend vendor error:', error);
    return errorResponse('Failed to suspend vendor', 500);
  }
}
