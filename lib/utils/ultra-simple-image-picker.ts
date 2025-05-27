import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Ultra-simple image picker functions with identical permission handling
 * Both camera and gallery use the exact same pattern
 */

export interface ImageResult {
  uri: string;
  width: number;
  height: number;
  type: 'image';
}

/**
 * Ultra-simple camera capture - use same pattern as gallery
 */
export async function takePhoto(): Promise<ImageResult | null> {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return null;
    }

    console.log('[UltraSimpleImagePicker] Launching camera...');
    // Use IDENTICAL options to gallery for consistency
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    console.log('[UltraSimpleImagePicker] Camera result received');

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[UltraSimpleImagePicker] Camera canceled or no assets');
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      console.log('[UltraSimpleImagePicker] No asset in result');
      return null;
    }
    
    console.log('[UltraSimpleImagePicker] Camera success, returning asset');
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image' as const,
    };
  } catch (error) {
    console.error('[UltraSimpleImagePicker] Camera error:', error);
    Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Ultra-simple gallery selection - use IDENTICAL pattern to camera
 * Key insight: Both functions should behave identically, just call different launch methods
 */
export async function selectFromGallery(): Promise<ImageResult | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required to select images.');
      return null;
    }

    console.log('[UltraSimpleImagePicker] Launching image library...');
    
    // Use IDENTICAL options to camera for consistency
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    console.log('[UltraSimpleImagePicker] Gallery result received');

    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('[UltraSimpleImagePicker] Gallery canceled or no assets');
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      console.log('[UltraSimpleImagePicker] No asset in result');
      return null;
    }
    
    console.log('[UltraSimpleImagePicker] Gallery success, returning asset');
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image' as const,
    };
  } catch (error) {
    console.error('[UltraSimpleImagePicker] Gallery error:', error);
    Alert.alert('Gallery Error', 'Failed to select image. Please try again.');
    return null;
  }
}
