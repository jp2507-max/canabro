import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// Revert back to HOC: Import Q from core, default import for withObservables
import { Database, Q } from '@nozbe/watermelondb'; // Added Database import
import withObservables from '@nozbe/with-observables'; // Default import
import { BlurView as ExpoBlurView } from 'expo-blur';
// import { LinearGradient } from 'expo-linear-gradient'; // No longer needed
import { Link, useRouter } from 'expo-router'; // Keep Link and useRouter
import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // Import useSafeAreaInsets

import { AddPlantForm } from '../../components/AddPlantForm';
import { EnhancedPlantList } from '../../components/PlantList'; // Import EnhancedPlantList
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';
import usePullToRefresh from '../../lib/hooks/usePullToRefresh';
import useWatermelon from '../../lib/hooks/useWatermelon'; // Keep for database instance
import Constants from 'expo-constants';
import { Plant } from '../../lib/models/Plant'; // Keep Plant type if needed elsewhere

// --- Tag Pill Component ---
const TagPill = ({ text, isDarkMode }: { text: string; isDarkMode: boolean }) => (
  <View className="mr-2 rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
    <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{text}</Text>
  </View>
);

// --- Define HomeScreenProps ---
// No longer needs plants passed directly, but might need database if not using context hook
interface HomeScreenProps {
  // plants: Plant[]; // Removed
  database: Database; // Pass database instance for PlantList HOC
}

// --- HomeScreen Component ---
function HomeScreen({ database }: HomeScreenProps) {
  // Receive database prop
  const { theme, isDarkMode } = useTheme();
  const router = useRouter(); // Use router consistently
  const { refreshing, handleRefresh } = usePullToRefresh({
    showFeedback: true,
    forceSync: true,
  });
  const [isAddPlantModalVisible, setIsAddPlantModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const [plantCount, setPlantCount] = useState(0); // State for plant count

  // FAB Menu State
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const insets = useSafeAreaInsets(); // Get safe area insets

  // Check if in development mode
  const isDevelopment = Constants.expoConfig?.extra?.ENV === 'development' || __DEV__;

  // Callback to update plant count and loading state
  const handleCountChange = (count: number) => {
    setPlantCount(count);
    setIsLoading(false); // Assume loading is finished when count is reported
  };

  const handleAddPlant = () => {
    setIsAddPlantModalVisible(true);
    setIsFabMenuOpen(false); // Close FAB menu if open
  };

  const handleAddPlantSuccess = () => {
    setIsAddPlantModalVisible(false);
    handleRefresh();
  };

  // FAB Menu Actions (Placeholders)
  const handleAddTaskToAll = () => {
    console.log('Add task to all plants');
    setIsFabMenuOpen(false);
  };
  const handleAddTaskToPlant = () => {
    console.log('Add task to specific plant');
    setIsFabMenuOpen(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      {/* Apply background color to SafeAreaView */}
      <ThemedView
        className="flex-1" // Add flex-1 back here
        lightClassName="bg-neutral-50"
        darkClassName="bg-black">
        {/* Removed absolutely positioned profile icon */}

        {/* Content Area - Now directly using EnhancedPlantList as the main scroll container */}
        <EnhancedPlantList
          database={database} // Pass database instance
          isLoading={isLoading} // Pass loading state
          onCountChange={handleCountChange} // Pass callback
          refreshing={refreshing} // Pass refreshing state for RefreshControl
          onRefresh={handleRefresh} // Pass refresh handler
          // Pass header content as ListHeaderComponent
          ListHeaderComponent={
            <View className="px-4 pt-4">
              {/* Header Row: Title + Icon */}
              <View className="flex-row items-center justify-between mb-2">
                <ThemedText
                  className="text-3xl font-bold" // Removed margin bottom here
                  lightClassName="text-neutral-800"
                  darkClassName="text-white">
                  Meine Pflanzen
                </ThemedText>
                {/* Profile Icon */}
                <Pressable
                  onPress={() => router.push('/profile')}
                  accessibilityLabel="View profile"
                  accessibilityRole="button">
                  {({ pressed }) => (
                    <Ionicons
                      name="person-circle-outline"
                      size={32}
                      color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[600]}
                      style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </View>
              {/* Static Tag Pills */}
              <View className="mb-4 flex-row">
                <TagPill text="Halbschatten" isDarkMode={isDarkMode} />
                <TagPill text="Drinnen" isDarkMode={isDarkMode} />
                <TagPill
                  text={`${plantCount} Pflanze${plantCount !== 1 ? 'n' : ''}`}
                  isDarkMode={isDarkMode}
                />
              </View></View>
          }
          // Ensure FlatList inside EnhancedPlantList has appropriate padding/styles
          // The FlatList itself will now handle the main scrolling
          // Add paddingBottom to the FlatList's contentContainerStyle inside EnhancedPlantList
          // to accommodate the FAB. We'll do this in the next step.
        />
        {/* Loading/Empty states are handled inside EnhancedPlantList */}
        {/* Floating Action Button (FAB) Area - Remains outside the list */}
        <View className="absolute bottom-6 right-6 z-10 items-end">
          {/* FAB Menu Options (conditionally rendered) - Using ternary operator */}
          {isFabMenuOpen ? (
            <View className="mb-3 items-end">
              <Pressable
                className="mb-3 flex-row items-center rounded-full bg-neutral-200 px-4 py-2 dark:bg-neutral-700"
                onPress={handleAddTaskToAll}>
                <Text className="mr-2 text-sm text-neutral-800 dark:text-neutral-200">
                  Aufg. zu allen Pfl. hinzuf.
                </Text>
                <MaterialCommunityIcons
                  name="playlist-plus"
                  size={20}
                  color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[600]}
                />
              </Pressable>
              <Pressable
                className="mb-3 flex-row items-center rounded-full bg-neutral-200 px-4 py-2 dark:bg-neutral-700"
                onPress={handleAddTaskToPlant}>
                <Text className="mr-2 text-sm text-neutral-800 dark:text-neutral-200">
                  Aufgabe zu Pflanze hinzufügen
                </Text>
                <MaterialCommunityIcons
                  name="check-circle-outline" // Example icon
                  size={20}
                  color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[600]}
                />
              </Pressable>
              <Pressable
                className="mb-3 flex-row items-center rounded-full bg-neutral-200 px-4 py-2 dark:bg-neutral-700"
                onPress={handleAddPlant}>
                <Text className="mr-2 text-sm text-neutral-800 dark:text-neutral-200">
                  Pflanze hinzufügen
                </Text>
                <MaterialCommunityIcons
                  name="sprout-outline" // Plant icon
                  size={20}
                  color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[600]}
                />
              </Pressable>
            </View>
          ) : null}
          {/* Main FAB */}
          <TouchableOpacity
            className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
            style={{
              backgroundColor: isFabMenuOpen
                ? theme.colors.neutral[500]
                : theme.colors.primary[500],
            }} // Change color when open
            onPress={() => setIsFabMenuOpen(!isFabMenuOpen)}
            accessibilityLabel={isFabMenuOpen ? 'Close actions menu' : 'Open actions menu'}
            accessibilityRole="button">
            <Ionicons name={isFabMenuOpen ? 'close' : 'add'} size={30} color="white" />
          </TouchableOpacity>
        </View>
        {/* Add Plant Modal (remains the same) */}
        <Modal
          visible={isAddPlantModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsAddPlantModalVisible(false)}>
          <ExpoBlurView
            intensity={10}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <ThemedView
            className="mt-20 flex-1 overflow-hidden rounded-t-3xl"
            lightClassName="bg-white"
            darkClassName="bg-neutral-900">
            <View
              className="flex-row items-center justify-between border-b p-4"
              style={{
                borderColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200],
              }}>
              <ThemedText
                className="text-xl font-bold"
                lightClassName="text-neutral-800"
                darkClassName="text-white">
                Add New Plant
              </ThemedText>
              <TouchableOpacity onPress={() => setIsAddPlantModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
                />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 p-4">
              <AddPlantForm onSuccess={handleAddPlantSuccess} />
            </ScrollView>
          </ThemedView>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

// Export the HomeScreen component for use with HOCs
// HOC now only needs to provide the database instance
export default function HomeScreenContainer() {
  const { database } = useWatermelon(); // Get database instance

  // Render HomeScreen directly, passing the database instance
  // Remove the unnecessary withObservables HOC wrapper

  // Ensure database is ready before rendering HomeScreen
  if (!database) {
    // Render nothing until the database is available to simplify initial render
    return null;
  }

  // Pass database directly as a prop
  return <HomeScreen database={database} />;
}
