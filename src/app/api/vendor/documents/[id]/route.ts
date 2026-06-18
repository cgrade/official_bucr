import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/api-response';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    // Find the document
    const document = await db.vendorDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return notFoundResponse('Document not found');
    }

    // Verify document belongs to this vendor
    if (document.vendorId !== vendor.id) {
      return forbiddenResponse('You do not have permission to delete this document');
    }

    // Only allow deletion if document is pending or rejected
    if (document.status === 'approved') {
      return forbiddenResponse('Cannot delete an approved document');
    }

    // Delete the document
    await db.vendorDocument.delete({
      where: { id },
    });

    return successResponse(null, 'Document deleted successfully');
  } catch (error) {
    console.error('Delete document error:', error);
    return errorResponse('Failed to delete document', 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { id } = await params;

    const document = await db.vendorDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return notFoundResponse('Document not found');
    }

    if (document.vendorId !== vendor.id) {
      return forbiddenResponse('You do not have permission to view this document');
    }

    return successResponse(document);
  } catch (error) {
    console.error('Get document error:', error);
    return errorResponse('Failed to get document', 500);
  }
}
