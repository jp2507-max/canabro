import { Database } from '@nozbe/watermelondb';
import { useState } from 'react';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnhancedPlantList } from '../../../components/PlantList';
import { useTranslation } from 'react-i18next';
import AddPlantModal from '../../../components/ui/AddPlantModal';
import FloatingActionButton from '../../../components/ui/FloatingActionButton';
import HomeHeader from '../../../components/ui/HomeHeader';
import ThemedText from '../../../components/ui/ThemedText';
import usePullToRefresh from '../../../lib/hooks/usePullToRefresh';
import useWatermelon from '../../../lib/hooks/useWatermelon';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';

interface HomeScreenProps {
  database: Database;
}

// Define specific route types for better type safety
type TaskRoute = '/(app)/(tabs)/calendar/add-plant-task' | '/(app)/(tabs)/calendar/add-task';

function HomeScreen({ database }: HomeScreenProps) {
  const { t } = useTranslation();
  const router = useSafeRouter();
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
    setIsFabMenuOpen(false); // Close FAB menu when opening modal
  };

  const handleAddPlantSuccess = () => {
    setIsAddPlantModalVisible(false);
    handleRefresh(); // Refresh list after adding a plant
  };

  const handleNavigateToTask = (route: TaskRoute) => {
    setIsFabMenuOpen(false);
    router.push(route);
  };

  type IconName =
    | 'default'
    | 'search'
    | 'leaf-outline'
    | 'pencil-outline'
    | 'layers-outline'
    | 'close-outline'
    | 'add-outline'
    | 'add'
    | 'close'
    | 'checkmark'
    | 'checkmark-circle'
    | 'chevron-forward';

  const fabActions: Array<{
    iconName: IconName;
    onPress: () => void;
    accessibilityLabel: string;
    size: number;
    label: string;
  }> = [
    {
      iconName: 'leaf-outline',
      onPress: handleAddPlant,
      accessibilityLabel: 'Add new plant',
      size: 48,
      label: 'New Plant',
    },
    {
      iconName: 'pencil-outline',
      onPress: () => handleNavigateToTask('/(app)/(tabs)/calendar/add-plant-task'),
      accessibilityLabel: 'Add task to a plant',
      size: 48,
      label: 'Task for Plant',
    },
    {
      iconName: 'layers-outline',
      onPress: () => handleNavigateToTask('/(app)/(tabs)/calendar/add-task'),
      accessibilityLabel: 'Add task to all plants',
      size: 48,
      label: 'Task for All',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-100 dark:bg-neutral-900">
      <EnhancedPlantList
        database={database}
        isLoading={isLoading}
        onCountChange={handleCountChange}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={<HomeHeader plantCount={plantCount} />}
        contentContainerStyle={{ paddingBottom: isFabMenuOpen ? 180 : 80 }}
      />

      {/* Floating Action Button and Menu */}
      {/* Container for FABs to ensure they are positioned correctly relative to each other and the screen edge */}
      {/* Note: Padding changed from p-4 to p-6 */}
      <View className="absolute bottom-0 right-0 z-20 items-end p-6">
        {isFabMenuOpen && (
          <View className="mb-4 items-end space-y-3">
            {fabActions.map((action) => (
              <View key={action.accessibilityLabel} className="flex-row items-center">
                {action.label && (
                  <View className="mr-3 rounded-lg bg-black/70 px-3 py-1.5 shadow-md dark:bg-neutral-700/90">
                    <ThemedText className="text-xs font-medium text-white">
                      {action.label}
                    </ThemedText>
                  </View>
                )}
                {/* Individual FABs no longer need absolute positioning as they are in a View container */}
                <FloatingActionButton
                  iconName={action.iconName}
                  onPress={action.onPress}
                  accessibilityLabel={action.accessibilityLabel}
                  size={40} // Smaller size for action buttons - remains 40
                  className="relative shadow-xl"
                />
              </View>
            ))}
          </View>
        )}
        {/* Main FAB - also no longer needs absolute positioning if its parent View handles it */}
        <FloatingActionButton
          iconName={isFabMenuOpen ? 'close-outline' : 'add-outline'}
          onPress={() => setIsFabMenuOpen(!isFabMenuOpen)}
          accessibilityLabel={isFabMenuOpen ? 'Close actions menu' : 'Open actions menu'}
          size={56} // Adjusted to match calendar screen FAB size
          className="relative shadow-2xl" // Simplified className, removed redundant rounded-full and background colors
        />
      </View>

      {/* Add Plant Modal */}
      <AddPlantModal
        visible={isAddPlantModalVisible}
        onClose={() => setIsAddPlantModalVisible(false)}
        onSuccess={handleAddPlantSuccess}
      />
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
