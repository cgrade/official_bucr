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
import { broadcastEvent } from '@/lib/realtime';
import { uploadImage, deleteImage, validateImageFile } from '@/lib/upload';

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
    const file = formData.get('logo') as File | null;

    if (!file) {
      return validationErrorResponse(['logo file is required']);
    }

    // Validate file
    const validation = validateImageFile(file, {
      maxSize: 2 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    });
    if (!validation.valid) {
      return validationErrorResponse([validation.error!]);
    }

    // Delete old logo if exists
    if (vendor.logo) {
      try {
        await deleteImage(vendor.logo);
      } catch (error) {
        console.error('Failed to delete old logo:', error);
      }
    }

    // Upload new logo
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImage(buffer, {
      folder: 'logos',
      filename: `vendor-${vendor.id}`,
      width: 400,
      height: 400,
      crop: 'fill',
    });

    // Update vendor with logo URL
    await db.vendor.update({
      where: { id: vendor.id },
      data: { logo: result.url },
    });

    // Broadcast real-time event
    broadcastEvent('profile:updated', vendor.id, vendor.id, { logo: result.url });

    return successResponse({ logo: result.url }, 'Logo updated successfully');
  } catch (error) {
    console.error('Upload logo error:', error);
    return errorResponse('Failed to upload logo', 500);
  }
}
