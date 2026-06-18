import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-response';
import { uploadImage, validateImageFile } from '@/lib/upload';

async function getVendorForUser(userId: string) {
  return db.vendor.findFirst({
    where: { ownerId: userId, deletedAt: null },
  });
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

    // Handle multipart form data for file upload
    const formData = await request.formData() as unknown as globalThis.FormData;
    const file = formData.get('image') as File | null;

    if (!file) {
      return validationErrorResponse(['image file is required']);
    }

    // Validate file
    const validation = validateImageFile(file, { maxSize: 5 * 1024 * 1024 });
    if (!validation.valid) {
      return validationErrorResponse([validation.error!]);
    }

    // Upload image
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImage(buffer, {
      folder: 'menu',
      filename: `${vendor.id}-${Date.now()}`,
    });

    return successResponse({ url: result.url }, 'Image uploaded successfully');
  } catch (error) {
    console.error('Upload menu image error:', error);
    return errorResponse('Failed to upload image', 500);
  }
}
