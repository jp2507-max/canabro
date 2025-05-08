import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Database } from '@nozbe/watermelondb';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddPlantForm } from '../../components/AddPlantForm';
import { EnhancedPlantList } from '../../components/PlantList';
import HomeHeader from '../../components/ui/HomeHeader';
import TagPill from '../../components/ui/TagPill';
import AddPlantModal from '../../components/ui/AddPlantModal';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import useWatermelon from '../../lib/hooks/useWatermelon';

interface HomeScreenProps {
  database: Database;
}

function HomeScreen({ database }: HomeScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const { refreshing, handleRefresh } = usePullToRefresh({ showFeedback: true, forceSync: true });
  const [isAddPlantModalVisible, setIsAddPlantModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plantCount, setPlantCount] = useState(0);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const handleCountChange = (count: number) => {
    setPlantCount(count);
    setIsLoading(false);
  };

  const handleAddPlant = () => {
    setIsAddPlantModalVisible(true);
    setIsFabMenuOpen(false);
  };

  const handleAddPlantSuccess = () => {
    setIsAddPlantModalVisible(false);
    handleRefresh();
  };

  const handleAddTaskToAll = () => {
    setIsFabMenuOpen(false);
    router.push('/add-task-all' as any);
  };
  const handleAddTaskToPlant = () => {
    setIsFabMenuOpen(false);
    router.push('/add-task-plant' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <ThemedView className="flex-1" lightClassName="bg-neutral-50" darkClassName="bg-black">
        <EnhancedPlantList
          database={database}
          isLoading={isLoading}
          onCountChange={handleCountChange}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <HomeHeader
              onAddPlant={handleAddPlant}
              plantCount={plantCount}
              isDarkMode={isDarkMode}
            />
          }
        />
        {/* Floating Action Button and Menu */}
        {isFabMenuOpen && (
          <View className="absolute bottom-20 right-6 space-y-4 z-10 items-end">
            <FloatingActionButton
              iconName="pencil-outline"
              onPress={handleAddTaskToPlant}
              accessibilityLabel="Add task to a plant"
              size={48}
            />
            <FloatingActionButton
              iconName="layers-outline"
              onPress={handleAddTaskToAll}
              accessibilityLabel="Add task to all plants"
              size={48}
            />
          </View>
        )}
        <FloatingActionButton
          iconName={isFabMenuOpen ? 'close' : 'add'}
          onPress={() => setIsFabMenuOpen(!isFabMenuOpen)}
          accessibilityLabel={isFabMenuOpen ? 'Close actions menu' : 'Open actions menu'}
          size={56}
        />
        {/* Add Plant Modal */}
        <AddPlantModal
          visible={isAddPlantModalVisible}
          onClose={() => setIsAddPlantModalVisible(false)}
          onSuccess={handleAddPlantSuccess}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

export default function HomeScreenContainer() {
  const { database } = useWatermelon();

  if (!database) {
    return null;
  }

  return <HomeScreen database={database} />;
}
