import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/api-response';
import { 
  uploadBase64, 
  generateSignedUploadUrl,
  isCloudinaryConfigured,
  UploadFolder 
} from '@/services/upload.service';
import { applyRateLimit } from '@/lib/middleware/rate-limit';

const uploadSchema = z.object({
  file: z.string().min(1, 'File data is required'),
  folder: z.enum(['documents', 'gallery', 'menu', 'avatars', 'vendors', 'events']),
  filename: z.string().optional(),
});

const signedUrlSchema = z.object({
  folder: z.enum(['documents', 'gallery', 'menu', 'avatars', 'vendors', 'events']),
  publicId: z.string().optional(),
});

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = applyRateLimit(request, 'api');
    if (rateLimitResponse) return rateLimitResponse;

    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = uploadSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    const { file, folder } = validation.data;

    // Size + type guard. `file` is base64, optionally a data URI. Cap the decoded size and,
    // when the MIME is declared, restrict to images (+ PDF for KYC documents). This stops
    // oversized/abusive uploads and disallows script-carrying types (e.g. SVG).
    const MAX_BYTES = folder === 'documents' ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
    const dataUri = file.match(/^data:([\w.+-]+\/[\w.+-]+);base64,/);
    const mime = dataUri?.[1];
    const base64Body = dataUri ? file.slice(dataUri[0].length) : file;
    const approxBytes = Math.floor((base64Body.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return errorResponse(`File too large. Maximum ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`, 413);
    }
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedTypes = folder === 'documents' ? [...imageTypes, 'application/pdf'] : imageTypes;
    if (mime && !allowedTypes.includes(mime)) {
      return errorResponse(`Unsupported file type (${mime}). Allowed: ${allowedTypes.join(', ')}.`, 415);
    }

    // Validate folder access based on user role
    if (folder === 'documents' && payload.role !== 'vendor') {
      return errorResponse('Only vendors can upload documents', 403);
    }
    if ((folder === 'gallery' || folder === 'menu' || folder === 'vendors' || folder === 'events') && payload.role !== 'vendor') {
      return errorResponse('Only vendors can upload to this folder', 403);
    }

    const result = await uploadBase64(file, { folder: folder as UploadFolder });

    if (!result.success) {
      return errorResponse(result.error || 'Upload failed', 400);
    }

    return successResponse(
      {
        url: result.url,
        publicId: result.publicId,
      },
      'File uploaded successfully',
      undefined,
      201
    );
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to upload file', 500);
  }
}

// GET /api/upload - Get signed URL for direct upload
export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);

    if (!payload) {
      return unauthorizedResponse();
    }

    if (!isCloudinaryConfigured()) {
      return errorResponse('File upload service not configured', 503);
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const publicId = searchParams.get('publicId') || undefined;

    const validation = signedUrlSchema.safeParse({ folder, publicId });

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return validationErrorResponse(errors);
    }

    // Validate folder access based on user role
    if (validation.data.folder === 'documents' && payload.role !== 'vendor') {
      return errorResponse('Only vendors can upload documents', 403);
    }

    const result = generateSignedUploadUrl({
      folder: validation.data.folder as UploadFolder,
      publicId: validation.data.publicId,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to generate upload URL', 500);
    }

    return successResponse({
      signature: result.signature,
      timestamp: result.timestamp,
      apiKey: result.apiKey,
      cloudName: result.cloudName,
      folder: `bucr/${validation.data.folder}`,
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    return errorResponse('Failed to generate upload URL', 500);
  }
}
