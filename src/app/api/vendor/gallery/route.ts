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

    const images = await db.galleryImage.findMany({
      where: { vendorId: vendor.id },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(images);
  } catch (error) {
    console.error('Get gallery error:', error);
    return errorResponse('Failed to get gallery', 500);
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

    // Handle multipart form data for file upload
    const formData = await request.formData() as unknown as globalThis.FormData;
    const file = formData.get('image') as File | null;
    const caption = formData.get('caption') as string | null;
    const category = formData.get('category') as string | null;

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
      folder: 'gallery',
      filename: `${vendor.id}-${Date.now()}`,
    });

    const url = result.url;

    const image = await db.galleryImage.create({
      data: {
        vendorId: vendor.id,
        url,
        caption: caption || undefined,
        category: category as any || undefined,
        sortOrder: 0,
      },
    });

    // Broadcast real-time event
    broadcastEvent('gallery:created', image.id, vendor.id, image);

    return successResponse(image, 'Image uploaded successfully', undefined, 201);
  } catch (error) {
    console.error('Upload image error:', error);
    return errorResponse('Failed to upload image', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return validationErrorResponse(['imageId is required']);
    }

    const image = await db.galleryImage.findFirst({
      where: { id: imageId, vendorId: vendor.id },
    });

    if (!image) {
      return errorResponse('Image not found', 404);
    }

    const body = await request.json();
    const { caption, isFeatured } = body;

    const updatedImage = await db.galleryImage.update({
      where: { id: imageId },
      data: {
        ...(caption !== undefined && { caption }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
    });

    // Broadcast real-time event
    broadcastEvent('gallery:updated', imageId, vendor.id, updatedImage);

    return successResponse(updatedImage, 'Image updated successfully');
  } catch (error) {
    console.error('Update image error:', error);
    return errorResponse('Failed to update image', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'vendor') {
      return unauthorizedResponse();
    }

    const vendor = await getVendorForUser(payload.sub);

    if (!vendor) {
      return forbiddenResponse('No vendor account found');
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return validationErrorResponse(['imageId is required']);
    }

    const image = await db.galleryImage.findFirst({
      where: { id: imageId, vendorId: vendor.id },
    });

    if (!image) {
      return errorResponse('Image not found', 404);
    }

    // Delete from storage
    try {
      await deleteImage(image.url);
    } catch (error) {
      console.error('Failed to delete image from storage:', error);
    }

    await db.galleryImage.delete({
      where: { id: imageId },
    });

    // Broadcast real-time event
    broadcastEvent('gallery:deleted', imageId, vendor.id, { id: imageId });

    return successResponse(null, 'Image deleted successfully');
  } catch (error) {
    console.error('Delete image error:', error);
    return errorResponse('Failed to delete image', 500);
  }
}
