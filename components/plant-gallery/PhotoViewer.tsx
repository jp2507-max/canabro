
import React, { memo, useCallback, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  PanGestureHandler, 
  PinchGestureHandler,
  PanGestureHandlerGestureEvent, 
  PinchGestureHandlerGestureEvent 
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { format } from '@/lib/utils/date';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { PlantPhoto } from '../../lib/models/PlantPhoto';
import { triggerLightHapticSync, triggerMediumHaptic } from '../../lib/utils/haptics';

interface PhotoViewerProps {
  photos: PlantPhoto[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
}

interface PhotoMetadataOverlayProps {
  photo: PlantPhoto;
  visible: boolean;
}

const PhotoMetadataOverlay = memo(function PhotoMetadataOverlay({ 
  photo, 
  visible 
}: PhotoMetadataOverlayProps) {
  const { t } = useTranslation();

  const overlayStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
    };
  });

  return (
    <Animated.View 
      style={overlayStyle}
      className="absolute bottom-0 left-0 right-0 bg-black/70 p-4"
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <ThemedView className="bg-transparent">
        {photo.caption && (
          <ThemedText className="mb-2 text-white text-base font-medium">
            {photo.caption}
          </ThemedText>
        )}
        
        <ThemedView className="flex-row items-center justify-between bg-transparent">
          <ThemedView className="flex-row items-center bg-transparent">
            <OptimizedIcon 
              name="calendar" 
              size={16} 
              className="mr-2 text-white" 
              isDecorative
            />
            <ThemedText className="text-white text-sm">
              {format(photo.takenAt, 'PPP')}
            </ThemedText>
          </ThemedView>
          
          <ThemedView className="flex-row items-center bg-transparent">
            <OptimizedIcon 
              name="leaf" 
              size={16} 
              className="mr-2 text-white" 
              isDecorative
            />
            <ThemedText className="text-white text-sm capitalize">
              {photo.growthStage}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {photo.formattedFileSize && (
          <ThemedText className="mt-2 text-white/70 text-xs">
            {t('photoViewer.fileSize')}: {photo.formattedFileSize}
          </ThemedText>
        )}
      </ThemedView>
    </Animated.View>
  );
});

interface PhotoControlsProps {
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  currentIndex: number;
  totalPhotos: number;
}

const PhotoControls = memo(function PhotoControls({
  visible,
  onClose,
  onDelete,
  currentIndex,
  totalPhotos,
}: PhotoControlsProps) {
  const { t } = useTranslation();

  const controlsStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
    };
  });

  const handleDelete = useCallback(() => {
    triggerMediumHaptic();
    onDelete?.();
  }, [onDelete]);

  const handleClose = useCallback(() => {
    triggerLightHapticSync();
    onClose();
  }, [onClose]);

  return (
    <Animated.View 
      style={controlsStyle}
      className="absolute top-0 left-0 right-0 flex-row items-center justify-between bg-black/70 p-4 pt-12"
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handleClose}
        className="flex-row items-center rounded-full bg-black/50 px-3 py-2"
      >
        <OptimizedIcon 
          name="close" 
          size={20} 
          className="text-white" 
          accessibilityLabel={t('photoViewer.close')}
        />
      </Pressable>

      <ThemedText className="text-white text-sm font-medium">
        {currentIndex + 1} / {totalPhotos}
      </ThemedText>

      {onDelete && (
        <Pressable
          onPress={handleDelete}
          className="flex-row items-center rounded-full bg-red-500/80 px-3 py-2"
        >
          <OptimizedIcon 
            name="trash" 
            size={20} 
            className="text-white" 
            accessibilityLabel={t('photoViewer.delete')}
          />
        </Pressable>
      )}
    </Animated.View>
  );
});

export const PhotoViewer = memo(function PhotoViewer({
  photos,
  initialIndex,
  visible,
  onClose,
  onDelete,
}: PhotoViewerProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Animation values for zoom and pan
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Swipe gesture values
  const swipeTranslateX = useSharedValue(0);

  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const swipeRef = useRef<PanGestureHandler>(null);

  // Reset transform values
  const resetTransform = useCallback(() => {
    'worklet';
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    focalX.value = 0;
    focalY.value = 0;
  }, []);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    setControlsVisible(prev => !prev);
    triggerLightHapticSync();
  }, []);

  // Handle photo swipe navigation
  const handleSwipeNavigation = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < photos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetTransform();
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetTransform();
    }
  }, [currentIndex, photos.length, resetTransform]);

  // Pinch gesture handler for zoom
  const pinchGestureHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, { startScale: number }>({
    onStart: (event, context) => {
      context.startScale = scale.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    },
    onActive: (event, context) => {
      scale.value = Math.max(0.5, Math.min(context.startScale * event.scale, 4));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  // Pan gesture handler for image movement
  const panGestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number }>({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      // Snap back to center if zoomed out too much
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  // Swipe gesture handler for photo navigation
  const swipeGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      swipeTranslateX.value = 0;
    },
    onActive: (event) => {
      if (scale.value <= 1) {
        swipeTranslateX.value = event.translationX;
      }
    },
    onEnd: (event) => {
      if (scale.value <= 1) {
        const threshold = screenWidth * 0.3;
        
        if (Math.abs(event.translationX) > threshold) {
          const direction = event.translationX > 0 ? 'right' : 'left';
          runOnJS(handleSwipeNavigation)(direction);
        }
        
        swipeTranslateX.value = withSpring(0);
      }
    },
  });

  // Animated styles
  const imageStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value + swipeTranslateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Handle delete confirmation
  const handleDeletePress = useCallback(() => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto || !onDelete) return;

    Alert.alert(
      t('photoViewer.deleteConfirmTitle'),
      t('photoViewer.deleteConfirmMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            onDelete(currentPhoto.id);
            // Close viewer if this was the last photo
            if (photos.length === 1) {
              onClose();
            } else if (currentIndex === photos.length - 1) {
              setCurrentIndex(prev => prev - 1);
            }
          },
        },
      ]
    );
  }, [photos, currentIndex, onDelete, onClose, t]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      resetTransform();
      setControlsVisible(true);
    }
  }, [visible, initialIndex, resetTransform]);

  if (!visible || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];

  if (!currentPhoto) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden={Platform.OS === 'ios'} />
      
      <ThemedView className="flex-1 bg-black">
        <Pressable
          onPress={toggleControls}
          className="flex-1 items-center justify-center"
        >
          <PinchGestureHandler
            ref={pinchRef}
            onGestureEvent={pinchGestureHandler}
            simultaneousHandlers={[panRef]}
          >
            <Animated.View className="flex-1 w-full">
              <PanGestureHandler
                ref={panRef}
                onGestureEvent={panGestureHandler}
                simultaneousHandlers={[pinchRef, swipeRef]}
                minPointers={1}
                maxPointers={1}
              >
                <Animated.View className="flex-1 w-full">
                  <PanGestureHandler
                    ref={swipeRef}
                    onGestureEvent={swipeGestureHandler}
                    simultaneousHandlers={[panRef]}
                    activeOffsetX={[-10, 10]}
                    failOffsetY={[-50, 50]}
                  >
                    <Animated.View className="flex-1 items-center justify-center">
                      <Animated.View style={imageStyle}>
                        <Image
                          source={currentPhoto.imageUrl}
                          style={{
                            width: screenWidth,
                            height: screenHeight,
                          }}
                          contentFit="contain"
                          transition={300}
                        />
                      </Animated.View>
                    </Animated.View>
                  </PanGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </Pressable>

        <PhotoControls
          visible={controlsVisible}
          onClose={onClose}
          onDelete={onDelete ? handleDeletePress : undefined}
          currentIndex={currentIndex}
          totalPhotos={photos.length}
        />

        <PhotoMetadataOverlay
          photo={currentPhoto}
          visible={controlsVisible}
        />
      </ThemedView>
    </Modal>
  );
});