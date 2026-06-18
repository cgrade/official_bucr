import { v2 as cloudinary } from 'cloudinary';
import { config } from '@/lib/config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export type UploadFolder = 'documents' | 'gallery' | 'menu' | 'avatars' | 'vendors' | 'events';

interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

interface UploadOptions {
  folder: UploadFolder;
  resourceType?: 'image' | 'raw' | 'auto';
  maxFileSize?: number; // in bytes
  allowedFormats?: string[];
  transformation?: object;
}

const DEFAULT_OPTIONS: Partial<UploadOptions> = {
  resourceType: 'auto',
  maxFileSize: 10 * 1024 * 1024, // 10MB default
};

const FOLDER_CONFIGS: Record<UploadFolder, Partial<UploadOptions>> = {
  documents: {
    resourceType: 'raw',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  gallery: {
    resourceType: 'image',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: { quality: 'auto', fetch_format: 'auto' },
  },
  menu: {
    resourceType: 'image',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: { quality: 'auto', fetch_format: 'auto', width: 800 },
  },
  avatars: {
    resourceType: 'image',
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: { quality: 'auto', fetch_format: 'auto', width: 400, height: 400, crop: 'fill' },
  },
  vendors: {
    resourceType: 'image',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: { quality: 'auto', fetch_format: 'auto' },
  },
  events: {
    resourceType: 'image',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: { quality: 'auto', fetch_format: 'auto' },
  },
};

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
}

/**
 * Save base64 file to local filesystem (dev fallback when Cloudinary is not configured)
 */
async function uploadToLocal(
  base64Data: string,
  options: UploadOptions
): Promise<UploadResult> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Extract mime type and raw base64
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    return { success: false, error: 'Invalid base64 image data' };
  }

  const mimeType = matches[1];
  const rawBase64 = matches[2];
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', options.folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${options.folder}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, Buffer.from(rawBase64, 'base64'));

  const baseUrl = config.app.url || 'http://localhost:3000';
  const url = `${baseUrl}/uploads/${options.folder}/${filename}`;
  return { success: true, url, publicId: filename };
}

/**
 * Upload a file to Cloudinary from base64 (falls back to local storage in dev)
 */
export async function uploadBase64(
  base64Data: string,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    // Validate base64 data
    if (!base64Data) {
      return { success: false, error: 'No file data provided' };
    }

    const folderConfig = FOLDER_CONFIGS[options.folder];
    const mergedOptions = { ...DEFAULT_OPTIONS, ...folderConfig, ...options };

    // Check file size (rough estimate from base64)
    const estimatedSize = (base64Data.length * 3) / 4;
    if (mergedOptions.maxFileSize && estimatedSize > mergedOptions.maxFileSize) {
      return { 
        success: false, 
        error: `File too large. Maximum size is ${Math.round(mergedOptions.maxFileSize / 1024 / 1024)}MB` 
      };
    }

    // Fallback to local filesystem if Cloudinary is not configured
    if (!isCloudinaryConfigured()) {
      console.log(`[Upload] Cloudinary not configured, saving to local filesystem: ${options.folder}`);
      return uploadToLocal(base64Data, options);
    }

    const result = await cloudinary.uploader.upload(base64Data, {
      folder: `bucr/${options.folder}`,
      resource_type: mergedOptions.resourceType,
      allowed_formats: mergedOptions.allowedFormats,
      transformation: mergedOptions.transformation,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload a file to Cloudinary from URL
 */
export async function uploadFromUrl(
  url: string,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary not configured' };
    }

    const folderConfig = FOLDER_CONFIGS[options.folder];
    const mergedOptions = { ...DEFAULT_OPTIONS, ...folderConfig, ...options };

    const result = await cloudinary.uploader.upload(url, {
      folder: `bucr/${options.folder}`,
      resource_type: mergedOptions.resourceType,
      allowed_formats: mergedOptions.allowedFormats,
      transformation: mergedOptions.transformation,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFile(publicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary not configured' };
    }

    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Generate a signed upload URL for direct client uploads
 */
export function generateSignedUploadUrl(options: {
  folder: UploadFolder;
  publicId?: string;
  expiresIn?: number; // seconds
}): { success: boolean; signature?: string; timestamp?: number; apiKey?: string; cloudName?: string; error?: string } {
  try {
    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Cloudinary not configured' };
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folderConfig = FOLDER_CONFIGS[options.folder];

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder: `bucr/${options.folder}`,
    };

    if (options.publicId) {
      paramsToSign.public_id = options.publicId;
    }

    if (folderConfig.allowedFormats) {
      paramsToSign.allowed_formats = folderConfig.allowedFormats.join(',');
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      config.cloudinary.apiSecret
    );

    return {
      success: true,
      signature,
      timestamp,
      apiKey: config.cloudinary.apiKey,
      cloudName: config.cloudinary.cloudName,
    };
  } catch (error) {
    console.error('Signature generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signature',
    };
  }
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const { width, height, quality = 'auto', format = 'auto' } = options;
  
  let transformation = `q_${quality},f_${format}`;
  if (width) transformation += `,w_${width}`;
  if (height) transformation += `,h_${height}`;

  // Insert transformation into URL
  return url.replace('/upload/', `/upload/${transformation}/`);
}
