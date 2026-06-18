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

const verifyDocumentSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
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

    const document = await db.vendorDocument.findUnique({
      where: { id: params.id },
      include: { vendor: true },
    });

    if (!document) {
      return notFoundResponse('Document');
    }

    const body = await request.json();
    const validation = verifyDocumentSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { status, rejectionReason } = validation.data;

    if (status === 'rejected' && !rejectionReason) {
      return validationErrorResponse(['Rejection reason is required']);
    }

    // Update document
    const updatedDocument = await db.vendorDocument.update({
      where: { id: params.id },
      data: {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        reviewedById: payload.sub,
        reviewedAt: new Date(),
      },
    });

    // Check if all required documents are approved
    const allDocuments = await db.vendorDocument.findMany({
      where: { vendorId: document.vendorId },
    });

    const requiredDocs = allDocuments.filter((d) => d.isRequired);
    const allRequiredApproved = requiredDocs.every((d) => d.status === 'approved');

    // Update vendor verification status
    if (allRequiredApproved) {
      await db.vendor.update({
        where: { id: document.vendorId },
        data: { verificationStatus: 'approved' },
      });
    } else if (status === 'rejected') {
      await db.vendor.update({
        where: { id: document.vendorId },
        data: { verificationStatus: 'rejected' },
      });
    }

    return successResponse(
      {
        document: updatedDocument,
        vendorVerificationStatus: allRequiredApproved ? 'approved' : 
          status === 'rejected' ? 'rejected' : 'pending',
      },
      `Document ${status}`
    );
  } catch (error) {
    console.error('Verify document error:', error);
    return errorResponse('Failed to verify document', 500);
  }
}
