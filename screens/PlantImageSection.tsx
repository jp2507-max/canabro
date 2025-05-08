import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, Image, View, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ThemedText from '../components/ui/ThemedText';
import ThemedView from '../components/ui/ThemedView';

interface PlantImageSectionProps {
  initialImageUri?: string | null;
  isEditing?: boolean;
  isDarkMode: boolean;
  theme: any;
  onImageChange?: (uri: string | null) => void;
}

const PlantImageSection: React.FC<PlantImageSectionProps> = ({
  initialImageUri = null,
  isEditing = false,
  isDarkMode,
  theme,
  onImageChange,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(initialImageUri);
  const [processing, setProcessing] = useState(false);

  async function processAndSetImage(uri: string) {
    try {
      setProcessing(true);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUri(manipResult.uri);
      onImageChange?.(manipResult.uri);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  }

  async function handleImagePick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }

  async function handleTakePicture() {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission || cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  }

  return (
    <ThemedView className="items-center mb-6">
      {processing ? (
        <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-black/50">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <ThemedText className="mt-2 text-white">Processing...</ThemedText>
        </View>
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 180, height: 180, borderRadius: 12 }}
          resizeMode="cover"
          accessibilityLabel="Plant image preview"
        />
      ) : (
        <Ionicons
          name="leaf-outline"
          size={96}
          color={isDarkMode ? theme.colors.primary[300] : theme.colors.primary[500]}
        />
      )}
      {isEditing && (
        <View className="flex-row mt-4 space-x-4">
          <TouchableOpacity
            className="rounded-lg bg-primary-500 px-4 py-2"
            onPress={handleImagePick}
            accessibilityLabel="Pick image from gallery"
          >
            <ThemedText className="text-white font-medium">Pick Image</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg bg-primary-500 px-4 py-2"
            onPress={handleTakePicture}
            accessibilityLabel="Take a new picture"
          >
            <ThemedText className="text-white font-medium">Take Picture</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
};

export default PlantImageSection;
