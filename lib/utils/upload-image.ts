import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import supabase from '../supabase';

/**
 * Supported storage buckets for image uploads
 */
export type StorageBucket = 'posts' | 'plants' | 'diary_entries' | 'plant-images';

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
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Image compression quality (0-1, default: 0.7) */
  compressionQuality?: number;
  /** Maximum image width for resizing (default: 1024) */
  maxWidth?: number;
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Get file path structure based on bucket type
 */
function getFilePath(bucket: StorageBucket, userId: string, filename: string, plantId?: string): string {
  switch (bucket) {
    case 'posts':
      return `${userId}/${filename}`;
    case 'plants':
      return `${userId}/${filename}`;
    case 'diary_entries':
      return `${userId}/${filename}`;
    case 'plant-images':
      return `${userId}/${filename}`;
    default:
      return `${userId}/${filename}`;
  }
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
 * @returns Promise<UploadResult> Upload result with public URL or error
 */
export async function uploadImage(options: UploadImageOptions): Promise<UploadResult> {
  const {
    bucket,
    userId,
    imageUri,
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    compressionQuality = 0.7,
    maxWidth = 1024,
  } = options;

  try {
    console.log(`Starting image upload to ${bucket} bucket for user ${userId}`);

    // Step 1: Image manipulation (resize and compress)
    console.log('Manipulating image...');
    const manipResult = await manipulateAsync(
      imageUri,
      [{ resize: { width: maxWidth } }],
      { compress: compressionQuality, format: SaveFormat.JPEG }
    );

    console.log(`Image manipulated: ${manipResult.width}x${manipResult.height}`);

    // Step 2: File size validation
    const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
    if (fileInfo.exists && fileInfo.size && fileInfo.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      Alert.alert('File Too Large', `Please select an image smaller than ${maxSizeMB}MB.`);
      return { success: false, error: 'File too large' };
    }

    // Step 3: Get authentication session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session for upload');
    }

    // Step 4: Get Supabase URL from configuration
    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    // Step 5: Generate filename and file path
    const filename = generateFilename(bucket, options);
    const filePath = getFilePath(bucket, userId, filename, options.plantId);
    
    console.log(`Uploading to ${bucket} bucket at path: ${filePath}`);

    // Step 6: Upload using FileSystem for memory efficiency
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
      throw new Error(`Upload failed with status ${uploadResult.status}: ${errorText}`);
    }

    // Step 7: Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    
    if (!urlData?.publicUrl) {
      console.error('Could not get public URL for path:', filePath);
      throw new Error('Could not get public URL after upload');
    }

    console.log(`Image uploaded successfully. Public URL: ${urlData.publicUrl}`);
    
    return {
      success: true,
      publicUrl: urlData.publicUrl,
    };

  } catch (error) {
    console.error('Error uploading image:', error);
    Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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