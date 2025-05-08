import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Define the types based on expo-camera documentation
type CameraType = 'front' | 'back';
type FlashMode = 'off' | 'on' | 'auto';

type CameraCaptureProps = {
  onImageCaptured: (imageUri: string) => void;
  onClose: () => void;
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCaptured, onClose }) => {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const cameraRef = useRef<any>(null);
  // const { width } = useWindowDimensions(); // width is unused

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCameraTypeToggle = () => {
    setCameraType((prevType) => (prevType === 'back' ? 'front' : 'back'));
  };

  const handleFlashToggle = () => {
    setFlashMode((prevMode) => (prevMode === 'off' ? 'on' : 'off'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const result = await cameraRef.current.takePictureAsync();
      if (result && result.uri) {
        onImageCaptured(result.uri);
      } else {
        Alert.alert('Error', 'Failed to capture image');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]?.uri) {
      onImageCaptured(result.assets[0].uri);
    }
  };

  if (!permission) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center"
        lightClassName="bg-white"
        darkClassName="bg-neutral-900">
        <ThemedText className="text-lg">Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center"
        lightClassName="bg-white"
        darkClassName="bg-neutral-900">
        <ThemedText className="mb-4 text-lg">Camera permission is required</ThemedText>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: theme.colors.primary[500],
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}>
          <ThemedText className="font-medium text-white">Grant Permission</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: theme.colors.neutral[500], padding: 12, borderRadius: 8 }}>
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flash={flashMode}
          onCameraReady={() => console.log('Camera ready')}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            Alert.alert('Error', 'Failed to initialize camera');
          }}>
          <View style={styles.cameraContent}>
            {/* Top controls */}
            <ThemedView
              className="absolute left-0 right-0 top-0 flex-row justify-between p-4"
              lightClassName="bg-black/20"
              darkClassName="bg-black/40">
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="close" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFlashToggle}>
                <Ionicons
                  name={flashMode === 'on' ? 'flash' : 'flash-off'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </ThemedView>

            {/* Bottom controls */}
            <ThemedView
              className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-8 py-6"
              lightClassName="bg-black/20"
              darkClassName="bg-black/40">
              <TouchableOpacity onPress={pickImage}>
                <Ionicons name="image-outline" size={30} color="white" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCameraTypeToggle}>
                <MaterialCommunityIcons name="camera-flip-outline" size={30} color="white" />
              </TouchableOpacity>
            </ThemedView>
          </View>
        </CameraView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default CameraCapture;
