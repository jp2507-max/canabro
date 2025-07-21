import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import supabase, { getSupabaseUrl } from '../supabase';
import Constants from 'expo-constants';

/**
 * Supported storage buckets for image uploads
 */
export type StorageBucket = 'community-questions' | 'community-plant-shares' | 'plants' | 'diary_entries';

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
  | 'UNKNOWN_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'UPLOAD_ERROR'
  | 'PUBLIC_URL_ERROR';

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
 * Upload error details
 */
export interface UploadError {
  type: UploadErrorType;
  message: string;
  details?: string;
  maxSizeMB?: number;
  actualSizeMB?: number;
  statusCode?: number;
  response?: string;
  originalError?: unknown;
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  uploadPath?: string;
  fileSize?: number;
  filename?: string;
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
    case 'community-questions':
      return `${options.filenamePrefix || 'question'}_${timestamp}_${randomSuffix}.jpg`;
    case 'community-plant-shares':
      return `${options.filenamePrefix || 'share'}_${timestamp}_${randomSuffix}.jpg`;
    case 'plants':
      return `${options.filenamePrefix || 'plant'}_${timestamp}_${randomSuffix}.jpg`;
    case 'diary_entries':
      return `diary_${options.plantId || 'entry'}_${timestamp}_${randomSuffix}.jpg`;
    default:
      return `image_${timestamp}_${randomSuffix}.jpg`;
  }
}

/**
 * Verify that an uploaded image URL is accessible
 * @param url The image URL to verify
 * @param maxAttempts Maximum number of verification attempts
 * @param delayMs Delay between attempts
 * @returns Promise<boolean> True if URL is accessible
 */
async function verifyImageAccessibility(
  url: string, 
  maxAttempts: number = 3, 
  delayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Verifying image accessibility (attempt ${attempt}/${maxAttempts}): ${url}`);
      
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'image/*',
        }
      });
      
      if (response.ok) {
        console.log('Image URL verified as accessible');
        return true;
      }
      
      console.warn(`Image URL verification failed with status ${response.status}`);
    } catch (error) {
      console.warn(`Image URL verification attempt ${attempt} failed:`, error);
    }
    
    // Wait before next attempt (except on last attempt)
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error('Image URL could not be verified as accessible after all attempts');
  return false;
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
    if (!session) {
      return {
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required for image upload',
        }
      };
    }

    // Step 5: Generate filename and upload path
    const filename = generateFilename(bucket, options);
    const uploadPath = `${userId}/${filename}`;
    
    console.log(`Uploading to ${bucket} bucket at path: ${uploadPath}`);

    // Step 6: Memory-efficient streaming upload using FileSystem.uploadAsync
    const uploadResult = await FileSystem.uploadAsync(
      `${Constants.expoConfig?.extra?.supabaseUrl}/storage/v1/object/${bucket}/${uploadPath}`,
      manipResult.uri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'multipart/form-data',
          'x-upsert': 'true', // Allow overwriting existing files
        },
      }
    );

    // Step 7: Handle upload response
    if (uploadResult.status !== 200) {
      const errorMessage = `Upload failed with status ${uploadResult.status}`;
      console.error(errorMessage, uploadResult.body);
      
      return {
        success: false,
        error: {
          type: 'UPLOAD_ERROR',
          message: errorMessage,
          statusCode: uploadResult.status,
          response: uploadResult.body,
        }
      };
    }

    // Step 8: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadPath);

    if (!publicUrlData?.publicUrl) {
      return {
        success: false,
        error: {
          type: 'PUBLIC_URL_ERROR',
          message: 'Failed to get public URL after successful upload',
        }
      };
    }

    console.log(`Image uploaded successfully. Public URL: ${publicUrlData.publicUrl}`);

    // Step 9: Verify image URL accessibility (new step)
    console.log('Verifying uploaded image accessibility...');
    const isAccessible = await verifyImageAccessibility(publicUrlData.publicUrl, 3, 1500);
    
    if (!isAccessible) {
      console.warn('Image uploaded but URL not immediately accessible - proceeding anyway');
      // Don't fail the upload, just warn. The image might become accessible shortly.
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      uploadPath,
      fileSize: fileInfo.exists ? fileInfo.size : undefined,
      filename,
    };

  } catch (error) {
    console.error('Image upload error:', error);
    
    return {
      success: false,
      error: {
        type: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Unknown upload error',
        originalError: error,
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
export const uploadQuestionImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'community-questions', userId, imageUri, filenamePrefix: 'question' });

export const uploadPlantShareImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'community-plant-shares', userId, imageUri, filenamePrefix: 'share' });

export const uploadPlantImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'plants', userId, imageUri, filenamePrefix: 'plant' });

export const uploadDiaryImage = (userId: string, imageUri: string, plantId: string) =>
  uploadImage({ bucket: 'diary_entries', userId, imageUri, plantId });

export const uploadPlantGalleryImage = (userId: string, imageUri: string) =>
  uploadImage({ bucket: 'plants', userId, imageUri });

/**
 * Convenience functions for comment images (stored in community buckets based on context)
 */
export const uploadCommentImage = (userId: string, imageUri: string, isQuestionComment = true) =>
  uploadImage({ 
    bucket: isQuestionComment ? 'community-questions' : 'community-plant-shares', 
    userId, 
    imageUri, 
    filenamePrefix: 'comment',
  });

/**
 * Advanced convenience functions for community uploads with custom options
 */
export const uploadQuestionImageWithOptions = (userId: string, imageUri: string, options?: Partial<UploadImageOptions>) =>
  uploadImage({ 
    bucket: 'community-questions', 
    userId, 
    imageUri, 
    ...options,
    filenamePrefix: 'question'
  });

export const uploadPlantShareImageWithOptions = (userId: string, imageUri: string, options?: Partial<UploadImageOptions>) =>
  uploadImage({ 
    bucket: 'community-plant-shares', 
    userId, 
    imageUri, 
    ...options,
    filenamePrefix: 'share'
  });

export const uploadPlantShareImageWithVerification = async (userId: string, imageUri: string): Promise<UploadResult> => {
  const result = await uploadImage({ 
    bucket: 'community-plant-shares', 
    userId, 
    imageUri, 
    filenamePrefix: 'share',
    maxSizeBytes: 2 * 1024 * 1024, // Smaller size for community posts
    compressionQuality: 0.8, // Higher quality for community sharing
  });
  
  // If upload successful but accessibility verification failed, 
  // add a warning but don't fail the upload
  if (result.success && result.publicUrl) {
    console.log('Plant share image uploaded successfully, verifying accessibility...');
    const isAccessible = await verifyImageAccessibility(result.publicUrl, 2, 2000);
    if (!isAccessible) {
      console.warn('Plant share image uploaded but may have delayed accessibility');
    }
  }
  
  return result;
};

export const uploadQuestionImageWithVerification = async (userId: string, imageUri: string): Promise<UploadResult> => {
  const result = await uploadImage({ 
    bucket: 'community-questions', 
    userId, 
    imageUri, 
    filenamePrefix: 'question',
    maxSizeBytes: 2 * 1024 * 1024, // Smaller size for community posts
    compressionQuality: 0.8, // Higher quality for community sharing
  });
  
  // If upload successful but accessibility verification failed, 
  // add a warning but don't fail the upload
  if (result.success && result.publicUrl) {
    console.log('Question image uploaded successfully, verifying accessibility...');
    const isAccessible = await verifyImageAccessibility(result.publicUrl, 2, 2000);
    if (!isAccessible) {
      console.warn('Question image uploaded but may have delayed accessibility');
    }
  }
  
  return result;
};
