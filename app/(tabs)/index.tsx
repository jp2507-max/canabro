import { Database } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnhancedPlantList } from '../../components/PlantList';
import AddPlantModal from '../../components/ui/AddPlantModal';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import HomeHeader from '../../components/ui/HomeHeader';
import ThemedText from '../../components/ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import useWatermelon from '../../lib/hooks/useWatermelon';

interface HomeScreenProps {
  database: Database;
}

function HomeScreen({ database }: HomeScreenProps) {
  const { isDarkMode } = useTheme();
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
    setIsFabMenuOpen(false); // Close FAB menu when opening modal
  };

  const handleAddPlantSuccess = () => {
    setIsAddPlantModalVisible(false);
    handleRefresh(); // Refresh list after adding a plant
  };

  const handleNavigateToTask = (route: string) => {
    setIsFabMenuOpen(false);
    router.push(route as any); // Type assertion for expo-router push
  };

  const fabActions = [
    {
      iconName: 'leaf-outline',
      onPress: handleAddPlant,
      accessibilityLabel: 'Add new plant',
      size: 48,
      label: 'New Plant'
    },
    {
      iconName: 'pencil-outline',
      onPress: () => handleNavigateToTask('/tasks/add-task-plant'),
      accessibilityLabel: 'Add task to a plant',
      size: 48,
      label: 'Task for Plant'
    },
    {
      iconName: 'layers-outline',
      onPress: () => handleNavigateToTask('/tasks/add-task-all'),
      accessibilityLabel: 'Add task to all plants',
      size: 48,
      label: 'Task for All'
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
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
      <View className="absolute bottom-0 right-0 p-6 z-20 items-end">
        {isFabMenuOpen && (
          <View className="mb-4 space-y-3 items-end">
            {fabActions.map((action) => (
              <View key={action.accessibilityLabel} className="flex-row items-center">
                {action.label && (
                  <View className="bg-black/70 dark:bg-neutral-700/90 mr-3 px-3 py-1.5 rounded-lg shadow-md">
                    <ThemedText className="text-white text-xs font-medium">
                      {action.label}
                    </ThemedText>
                  </View>
                )}
                {/* Individual FABs no longer need absolute positioning as they are in a View container */}
                <FloatingActionButton
                  iconName={action.iconName as any}
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
