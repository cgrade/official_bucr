import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (only if credentials are present)
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Use Cloudinary in production, local storage in development
const USE_CLOUDINARY = process.env.USE_CLOUDINARY === 'true' && isCloudinaryConfigured;

export interface UploadOptions {
  folder: string; // e.g., 'avatars', 'logos', 'gallery', 'menu'
  filename?: string; // Optional custom filename
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  quality?: string | number;
}

export interface UploadResult {
  url: string;
  publicId?: string; // Cloudinary public ID for deletion
  provider: 'local' | 'cloudinary';
}

const LOCAL_UPLOAD_BASE = path.join(process.cwd(), 'public', 'uploads');

/**
 * Ensure local upload directory exists
 */
async function ensureLocalDir(folder: string): Promise<string> {
  const dirPath = path.join(LOCAL_UPLOAD_BASE, folder);
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Upload to local storage
 */
async function uploadLocal(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  const dirPath = await ensureLocalDir(options.folder);
  
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const filename = options.filename || `${timestamp}-${randomStr}`;
  // Save as jpg — no format conversion happens locally, keeping .webp would
  // cause iOS to fail decoding JPEG bytes as WebP (content/extension mismatch).
  const ext = 'jpg';
  const fullFilename = `${filename}.${ext}`;
  const filePath = path.join(dirPath, fullFilename);
  
  await writeFile(filePath, buffer);
  
  const url = `/uploads/${options.folder}/${fullFilename}`;
  
  return {
    url,
    provider: 'local',
  };
}

/**
 * Upload to Cloudinary
 */
async function uploadCloudinary(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  const { folder, width, height, crop, quality = 'auto' } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, any> = {
      folder: `bucr/${folder}`,
      resource_type: 'image',
      quality,
    };

    if (width || height) {
      uploadOptions.transformation = [];
      if (width) uploadOptions.transformation.push({ width });
      if (height) uploadOptions.transformation.push({ height });
      if (crop) uploadOptions.transformation.push({ crop });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            provider: 'cloudinary',
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload an image - automatically uses local or Cloudinary based on config
 */
export async function uploadImage(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  if (USE_CLOUDINARY) {
    return uploadCloudinary(buffer, options);
  }
  return uploadLocal(buffer, options);
}

/**
 * Delete an image from storage
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url) return;

  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary')) {
    if (!isCloudinaryConfigured) {
      console.warn('Cloudinary not configured, cannot delete:', url);
      return;
    }
    
    // Extract public_id from Cloudinary URL
    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
    if (!matches) {
      console.warn('Could not extract public_id from Cloudinary URL:', url);
      return;
    }

    const publicId = matches[1];
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Failed to delete from Cloudinary:', error);
    }
    return;
  }

  // Local file deletion
  if (url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', url);
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (error) {
      console.error('Failed to delete local file:', error);
    }
  }
}

/**
 * Get the full URL for an image (handles both local and Cloudinary)
 */
export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Already a full URL (Cloudinary or external)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Local URL - prepend base URL in production
  if (url.startsWith('/uploads/')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
    return baseUrl ? `${baseUrl}${url}` : url;
  }
  
  return url;
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  files: { buffer: Buffer; options: UploadOptions }[]
): Promise<UploadResult[]> {
  return Promise.all(files.map(({ buffer, options }) => uploadImage(buffer, options)));
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] } = options || {};

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

export { USE_CLOUDINARY, isCloudinaryConfigured };
