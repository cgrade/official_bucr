import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';

const uploadDocumentSchema = z.object({
  type: z.enum(['cac', 'tin', 'owner_id', 'food_safety']),
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
});

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const documents = await db.vendorDocument.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
    });

    // Define required documents
    const requiredDocs = [
      { type: 'cac', name: 'CAC Certificate', isRequired: true },
      { type: 'owner_id', name: 'Owner Valid ID', isRequired: true },
      { type: 'tin', name: 'Tax Identification Number', isRequired: false },
      { type: 'food_safety', name: 'Food Safety Certificate', isRequired: false },
    ];

    const documentStatus = requiredDocs.map((req) => {
      const doc = documents.find((d) => d.type === req.type);
      return {
        type: req.type,
        name: req.name,
        isRequired: req.isRequired,
        status: doc?.status || 'not_submitted',
        document: doc || null,
      };
    });

    return successResponse({
      documents: documentStatus,
      verificationStatus: vendor.verificationStatus,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return errorResponse('Failed to get documents', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const body = await request.json();
    const validation = uploadDocumentSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { type, fileUrl, fileName } = validation.data;

    // Check if document already exists
    const existingDoc = await db.vendorDocument.findUnique({
      where: {
        vendorId_type: {
          vendorId: vendor.id,
          type,
        },
      },
    });

    let document;

    if (existingDoc) {
      // Update existing document (reset to pending)
      document = await db.vendorDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl,
          fileName,
          status: 'pending',
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
        },
      });
    } else {
      // Create new document
      document = await db.vendorDocument.create({
        data: {
          vendorId: vendor.id,
          type,
          fileUrl,
          fileName,
          isRequired: type === 'cac' || type === 'owner_id',
        },
      });
    }

    // Reset vendor verification status if it was rejected
    if (vendor.verificationStatus === 'rejected') {
      await db.vendor.update({
        where: { id: vendor.id },
        data: { verificationStatus: 'pending' },
      });
    }

    return successResponse(document, 'Document uploaded successfully', undefined, 201);
  } catch (error) {
    console.error('Upload document error:', error);
    return errorResponse('Failed to upload document', 500);
  }
}
