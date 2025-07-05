import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import supabase, { getSupabaseUrl } from '../supabase';

/**
 * Supported storage buckets for image uploads
 */
export type StorageBucket = 'posts' | 'plants' | 'diary_entries' | 'plant-images';

/**
 * Error types for upload operations
 */
export type UploadErrorType = 
  | 'FILE_TOO_LARGE'
  | 'NO_SESSION'
  | 'CONFIG_ERROR'
  | 'UPLOAD_FAILED'
  | 'URL_GENERATION_FAILED'
  | 'INVALID_FILE'
  | 'UNKNOWN_ERROR';

/**
 * Upload configuration options
 */
export interface UploadImageOptions {
  /** Storage bucket to upload to */
  bucket: StorageBucket;
  /** User ID for organizing files */
  userId: string;
  /** Image URI to upload */
  imageUri: string;
  /** Optional plant ID for diary entries */
  plantId?: string;
  /** Optional custom filename prefix */
  filenamePrefix?: string;
  /** Maximum file size in bytes (default: 3MB) */
  maxSizeBytes?: number;
  /** Image compression quality (0-1, default: 0.7) */
  compressionQuality?: number;
  /** Maximum image width for resizing (default: 1024) */
  maxWidth?: number;
}

/**
 * Detailed upload error information
 */
export interface UploadError {
  type: UploadErrorType;
  message: string;
  details?: string;
  maxSizeMB?: number;
  actualSizeMB?: number;
}

/**
 * Upload result with detailed error information
 */
export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: UploadError;
}

/**
 * Supported image file extensions
 */
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

/**
 * Validate that the image URI exists and is a supported image format
 * 
 * @param imageUri URI of the image to validate
 * @returns Promise<UploadError | null> Error if validation fails, null if valid
 */
async function validateImageUri(imageUri: string): Promise<UploadError | null> {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    
    if (!fileInfo.exists) {
      return {
        type: 'INVALID_FILE',
        message: 'Image file does not exist',
        details: `File not found at URI: ${imageUri}`,
      };
    }

    // Extract file extension from URI
    const uriLowerCase = imageUri.toLowerCase();
    const hasValidExtension = SUPPORTED_IMAGE_EXTENSIONS.some(ext => 
      uriLowerCase.endsWith(ext)
    );

    if (!hasValidExtension) {
      return {
        type: 'INVALID_FILE',
        message: 'Unsupported image file format',
        details: `Supported formats: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}. Got: ${imageUri}`,
      };
    }

    // Additional validation for file size (basic check)
    if (fileInfo.size === 0) {
      return {
        type: 'INVALID_FILE',
        message: 'Image file is empty',
        details: `File at ${imageUri} has zero bytes`,
      };
    }

    return null; // Valid file
    
  } catch (error) {
    return {
      type: 'INVALID_FILE',
      message: 'Failed to validate image file',
      details: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Get file path structure based on bucket type
 */
function getFilePath(bucket: StorageBucket, userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

/**
 * Generate filename based on bucket type and options
 */
function generateFilename(bucket: StorageBucket, options: UploadImageOptions): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  switch (bucket) {
    case 'posts':
      return `${options.filenamePrefix || 'post'}_${timestamp}.jpg`;
    case 'plants':
      return `${options.filenamePrefix || 'plant'}_${timestamp}.jpg`;
    case 'diary_entries':
      return `diary_${options.plantId || 'entry'}_${timestamp}.jpg`;
    case 'plant-images':
      return `plant-${timestamp}-${randomSuffix}.jpg`;
    default:
      return `image_${timestamp}.jpg`;
  }
}

/**
 * Upload image to Supabase Storage with memory-efficient streaming
 * 
 * @param options Upload configuration options
 * @returns Promise<UploadResult> Upload result with public URL or detailed error information
 */
export async function uploadImage(options: UploadImageOptions): Promise<UploadResult> {
  const {
    bucket,
    userId,
    imageUri,
    maxSizeBytes = 3 * 1024 * 1024, // 3MB default (reduced from 10MB)
    compressionQuality = 0.7,
    maxWidth = 1024,
  } = options;

  try {
    console.log(`Starting image upload to ${bucket} bucket for user ${userId}`);

    // Step 1: Validate image URI and format
    console.log('Validating image URI...');
    const validationError = await validateImageUri(imageUri);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Step 2: Image manipulation (resize and compress)
    console.log('Manipulating image...');
    const manipResult = await manipulateAsync(
      imageUri,
      [{ resize: { width: maxWidth } }],
      { compress: compressionQuality, format: SaveFormat.JPEG }
    );

    console.log(`Image manipulated: ${manipResult.width}x${manipResult.height}`);

    // Step 3: File size validation
    const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
    if (fileInfo.exists && fileInfo.size && fileInfo.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      const actualSizeMB = Math.round(fileInfo.size / (1024 * 1024));
      
      return { 
        success: false, 
        error: {
          type: 'FILE_TOO_LARGE',
          message: `File size (${actualSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
          maxSizeMB,
          actualSizeMB,
        }
      };
    }

    // Step 4: Get authentication session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return {
        success: false,
        error: {
          type: 'NO_SESSION',
          message: 'No valid authentication session for upload',
          details: 'User must be logged in to upload images',
        }
      };
    }

    // Step 5: Get Supabase URL from client configuration
    let supabaseUrl: string;
    try {
      supabaseUrl = getSupabaseUrl();
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'CONFIG_ERROR',
          message: 'Supabase URL not configured',
          details: error instanceof Error ? error.message : 'Failed to get Supabase URL from client',
        }
      };
    }

    // Step 6: Generate filename and file path
    const filename = generateFilename(bucket, options);
    const filePath = getFilePath(bucket, userId, filename);
    
    console.log(`Uploading to ${bucket} bucket at path: ${filePath}`);

    // Step 7: Upload using FileSystem for memory efficiency
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
    
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, manipResult.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (uploadResult.status !== 200) {
      const errorText = uploadResult.body || 'Unknown upload error';
      console.error('Upload failed:', errorText);
      
      return {
        success: false,
        error: {
          type: 'UPLOAD_FAILED',
          message: `Upload failed with status ${uploadResult.status}`,
          details: errorText,
        }
      };
    }

    // Step 8: Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    
    if (!urlData?.publicUrl) {
      console.error('Could not get public URL for path:', filePath);
      return {
        success: false,
        error: {
          type: 'URL_GENERATION_FAILED',
          message: 'Could not generate public URL after upload',
          details: `Failed to get public URL for path: ${filePath}`,
        }
      };
    }

    console.log(`Image uploaded successfully. Public URL: ${urlData.publicUrl}`);
    
    return {
      success: true,
      publicUrl: urlData.publicUrl,
    };

  } catch (error) {
    console.error('Error uploading image:', error);
    
    return {
      success: false,
      error: {
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred during upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
}

/**
 * Delete image from Supabase Storage
 * 
 * @param bucket Storage bucket
 * @param filePath File path to delete
 * @returns Promise<boolean> Success status
 */
export async function deleteImage(bucket: StorageBucket, filePath: string): Promise<boolean> {
  try {
    console.log(`Deleting image from ${bucket} bucket: ${filePath}`);
    
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    
    if (error) {
      console.warn('Failed to delete image:', error.message);
      return false;
    }
    
    console.log('Image deleted successfully');
    return true;
    
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Extract file path from public URL for deletion
 * 
 * @param publicUrl Public URL from Supabase Storage
 * @param userId User ID to construct the expected path
 * @returns string File path for deletion
 */
export function extractFilePathFromUrl(publicUrl: string, userId: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/');
    
    // Find the user ID in the path and extract everything after the bucket name
    const userIdIndex = pathParts.findIndex(part => part === userId);
    if (userIdIndex === -1) return null;
    
    // Return the path starting from userId
    return pathParts.slice(userIdIndex).join('/');
    
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
}

/**
 * Convenience functions for specific upload types
 */
export const uploadPostImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'posts', userId, imageUri, filenamePrefix: 'post' });

export const uploadPlantImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'plants', userId, imageUri, filenamePrefix: 'plant' });

export const uploadDiaryImage = (userId: string, imageUri: string, plantId: string) =>
  uploadImage({ bucket: 'diary_entries', userId, imageUri, plantId });

export const uploadPlantGalleryImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'plant-images', userId, imageUri });

/**
 * Convenience functions for comment images (stored in posts bucket)
 */
export const uploadCommentImage = (userId: string, imageUri: string) =>
  uploadImage({ 
    bucket: 'posts', 
    userId, 
    imageUri, 
    filenamePrefix: 'comment',
  }); 