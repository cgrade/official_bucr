import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<string> {
  const { folder = 'bucr', width, height, crop, quality = 'auto' } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, any> = {
      folder,
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
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(url: string): Promise<void> {
  // Extract public_id from URL
  const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
  if (!matches) {
    console.warn('Could not extract public_id from URL:', url);
    return;
  }

  const publicId = matches[1];

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
    throw error;
  }
}

/**
 * Generate a signed upload URL for client-side uploads
 */
export function generateSignedUploadUrl(options: {
  folder?: string;
  maxFileSize?: number;
}): { signature: string; timestamp: number; apiKey: string; cloudName: string } {
  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, any> = {
    timestamp,
    folder: options.folder || 'bucr',
  };

  if (options.maxFileSize) {
    params.max_file_size = options.maxFileSize;
  }

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

export default cloudinary;
