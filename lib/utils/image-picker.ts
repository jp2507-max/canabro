import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Simplified image picker functions with consistent permission handling
 * Both camera and gallery use identical patterns for reliability
 */

export interface ImageResult {
  uri: string;
  width: number;
  height: number;
  type: 'image';
}

/**
 * Capture photo using device camera
 * @returns Promise<ImageResult | null> - Returns image data or null if cancelled/failed
 */
export async function takePhoto(): Promise<ImageResult | null> {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is needed to take photos.');
      return null;
    }

    console.log('[ImagePicker] Launching camera...');
    
    // Use modern mediaTypes array syntax and consistent options
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    console.log('[ImagePicker] Camera result received');

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[ImagePicker] Camera canceled or no assets');
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      console.log('[ImagePicker] No asset in result');
      return null;
    }

    console.log('[ImagePicker] Camera success, returning asset');
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image' as const,
    };
  } catch (error) {
    console.error('[ImagePicker] Camera error:', error);
    Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Select image from device gallery
 * @returns Promise<ImageResult | null> - Returns image data or null if cancelled/failed
 */
export async function selectFromGallery(): Promise<ImageResult | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library permission is needed to select photos.');
      return null;
    }

    console.log('[ImagePicker] Launching image library...');

    // Use modern mediaTypes array syntax and consistent options
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    console.log('[ImagePicker] Gallery result received');

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[ImagePicker] Gallery canceled or no assets');
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      console.log('[ImagePicker] No asset in result');
      return null;
    }

    console.log('[ImagePicker] Gallery success, returning asset');
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image' as const,
    };
  } catch (error) {
    console.error('[ImagePicker] Gallery error:', error);
    Alert.alert('Gallery Error', 'Failed to select image. Please try again.');
    return null;
  }
}
