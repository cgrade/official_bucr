import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { uploadImage, deleteImage, validateImageFile } from '@/lib/upload';

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    const formData = await request.formData() as unknown as globalThis.FormData;
    const file = formData.get('avatar') as File;

    if (!file) {
      return validationErrorResponse(['Avatar file is required']);
    }

    // Validate file
    const validation = validateImageFile(file, { maxSize: 5 * 1024 * 1024 });
    if (!validation.valid) {
      return validationErrorResponse([validation.error!]);
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { avatar: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Delete old avatar if exists
    if (user.avatar) {
      try {
        await deleteImage(user.avatar);
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
      }
    }

    // Upload new avatar
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImage(buffer, {
      folder: 'avatars',
      filename: `user-${payload.sub}`,
      width: 400,
      height: 400,
      crop: 'fill',
    });

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: payload.sub },
      data: { avatar: result.url },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        creditsBalance: true,
        createdAt: true,
      },
    });

    return successResponse(updatedUser, 'Profile picture updated successfully');
  } catch (error) {
    console.error('Upload avatar error:', error);
    return errorResponse('Failed to upload profile picture', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload || payload.role !== 'user') {
      return unauthorizedResponse();
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { avatar: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (!user.avatar) {
      return errorResponse('No profile picture to delete', 400);
    }

    // Delete avatar from storage
    try {
      await deleteImage(user.avatar);
    } catch (error) {
      console.error('Failed to delete avatar from storage:', error);
    }

    // Remove avatar from user profile
    const updatedUser = await db.user.update({
      where: { id: payload.sub },
      data: { avatar: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        creditsBalance: true,
        createdAt: true,
      },
    });

    return successResponse(updatedUser, 'Profile picture removed successfully');
  } catch (error) {
    console.error('Delete avatar error:', error);
    return errorResponse('Failed to delete profile picture', 500);
  }
}
