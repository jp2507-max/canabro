

import React, { memo, useCallback } from 'react';
import { Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { FlashListWrapper } from '../ui/FlashListWrapper';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { PlantPhoto } from '../../lib/models/PlantPhoto';
import { triggerLightHapticSync } from '../../lib/utils/haptics';

interface PhotoGalleryProps {
  plantId: string;
  photos: PlantPhoto[];
  onPhotoPress: (photo: PlantPhoto, index: number) => void;
  onAddPhoto: () => void;
  numColumns?: number;
}

interface GrowthStageBadgeProps {
  stage: string;
}

const GrowthStageBadge = memo(function GrowthStageBadge({ stage }: GrowthStageBadgeProps) {
  // Map growth stages to semantic colors and icons
  const getStageConfig = (stage: string) => {
    const stageConfig = {
      seedling: { color: 'bg-green-100 dark:bg-green-900', textColor: 'text-green-800 dark:text-green-200', icon: 'sprout' as const },
      vegetative: { color: 'bg-blue-100 dark:bg-blue-900', textColor: 'text-blue-800 dark:text-blue-200', icon: 'leaf' as const },
      flowering: { color: 'bg-purple-100 dark:bg-purple-900', textColor: 'text-purple-800 dark:text-purple-200', icon: 'flower' as const },
      harvest: { color: 'bg-orange-100 dark:bg-orange-900', textColor: 'text-orange-800 dark:text-orange-200', icon: 'medal' as const },
    };
    
    return stageConfig[stage.toLowerCase() as keyof typeof stageConfig] || {
      color: 'bg-neutral-100 dark:bg-neutral-800',
      textColor: 'text-neutral-800 dark:text-neutral-200',
      icon: 'leaf-outline' as const
    };
  };

  const config = getStageConfig(stage);

  return (
    <ThemedView className={`absolute top-2 left-2 flex-row items-center rounded-full px-2 py-1 ${config.color}`}>
      <OptimizedIcon 
        name={config.icon} 
        size={12} 
        className={`mr-1 ${config.textColor}`}
        isDecorative
      />
      <ThemedText className={`text-xs font-medium ${config.textColor}`}>
        {stage}
      </ThemedText>
    </ThemedView>
  );
});

interface PhotoItemProps {
  photo: PlantPhoto;
  index: number;
  onPress: (photo: PlantPhoto, index: number) => void;
  itemSize: number;
}

const PhotoItem = memo(function PhotoItem({ photo, index, onPress, itemSize }: PhotoItemProps) {
  const handlePress = useCallback(() => {
    triggerLightHapticSync();
    onPress(photo, index);
  }, [photo, index, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      className="m-1 overflow-hidden rounded-xl"
      style={{ width: itemSize, height: itemSize }}
    >
      <Image
        source={photo.thumbnailUrl || photo.imageUrl}
        className="h-full w-full"
        contentFit="cover"
        transition={300}
      />
      <GrowthStageBadge stage={photo.growthStage} />
    </Pressable>
  );
});

interface AddPhotoButtonProps {
  onPress: () => void;
  itemSize: number;
}

const AddPhotoButton = memo(function AddPhotoButton({ onPress, itemSize }: AddPhotoButtonProps) {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    triggerLightHapticSync();
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      className="m-1 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800"
      style={{ width: itemSize, height: itemSize }}
    >
      <OptimizedIcon 
        name="add" 
        size={32} 
        className="mb-2 text-neutral-400 dark:text-neutral-500" 
      />
      <ThemedText variant="caption" className="text-center">
        {t('photoGallery.addPhoto')}
      </ThemedText>
    </Pressable>
  );
});

export const PhotoGallery = memo(function PhotoGallery({
  plantId,
  photos,
  onPhotoPress,
  onAddPhoto,
  numColumns = 3,
}: PhotoGalleryProps) {
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;
  
  // Calculate item size based on screen width and number of columns
  const itemSize = Math.floor((screenWidth - 32 - (numColumns - 1) * 8) / numColumns);

  const renderItem = useCallback(({ item, index }: { item: PlantPhoto | 'add-button'; index: number }) => {
    if (item === 'add-button') {
      return <AddPhotoButton onPress={onAddPhoto} itemSize={itemSize} />;
    }
    
    return (
      <PhotoItem
        photo={item}
        index={index}
        onPress={onPhotoPress}
        itemSize={itemSize}
      />
    );
  }, [onPhotoPress, onAddPhoto, itemSize]);

  const keyExtractor = useCallback((item: PlantPhoto | 'add-button', index: number) => {
    if (item === 'add-button') return 'add-button';
    return item.id;
  }, []);

  // Combine photos with add button
  const data = [...photos, 'add-button' as const];

  if (photos.length === 0) {
    return (
      <ThemedView className="items-center justify-center py-8">
        <OptimizedIcon 
          name="image-outline" 
          size={48} 
          className="mb-4 text-neutral-400 dark:text-neutral-500" 
        />
        <ThemedText variant="muted" className="mb-4 text-center">
          {t('photoGallery.noPhotos')}
        </ThemedText>
        <AddPhotoButton onPress={onAddPhoto} itemSize={120} />
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <FlashListWrapper
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
});