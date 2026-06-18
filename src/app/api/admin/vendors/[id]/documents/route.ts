import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

// GET /api/admin/vendors/[id]/documents - Get all documents for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'admin') {
      return unauthorizedResponse('Admin access required');
    }

    const vendorId = params.id;

    // Check if vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, businessName: true },
    });

    if (!vendor) {
      return notFoundResponse('Vendor not found');
    }

    // Get all documents for this vendor
    const documents = await db.vendorDocument.findMany({
      where: { vendorId },
      include: {
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({
      vendor: { id: vendor.id, businessName: vendor.businessName },
      documents,
    });
  } catch (error) {
    console.error('Error fetching vendor documents:', error);
    return errorResponse('Failed to fetch vendor documents');
  }
}
