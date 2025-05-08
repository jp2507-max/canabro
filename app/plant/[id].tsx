import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Database } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
import dayjs from 'dayjs'; // For date formatting
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  View, // Keep standard View for specific layout cases if needed
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StorageImage from '../../components/ui/StorageImage';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Plant } from '../../lib/models/Plant'; // GrowthStage enum is not exported/used in model
import { colors as themeColors } from '../../lib/theme'; // Import theme colors directly if needed
import PlantImageSection from '../../screens/PlantImageSection';
import { formatDate, formatBoolean, formatNumber } from '../../screens/plantHelpers';

// Helper to format dates
// const formatDate = (dateString: string | null | undefined) => {
//   if (!dateString) return 'Not set';
//   return dayjs(dateString).format('MMMM D, YYYY');
// };

// Helper to format boolean values
// const formatBoolean = (value: boolean | null | undefined) => {
//   if (value === null || value === undefined) return 'N/A';
//   return value ? 'Yes' : 'No';
// };

// Helper to format numbers (e.g., height, THC/CBD)
// const formatNumber = (value: number | null | undefined, unit: string = '') => {
//   if (value === null || value === undefined) return 'Not set';
//   return `${value}${unit}`;
// };

// Base component receiving the plant observable
function PlantDetailsScreenBase({ plant }: { plant: Plant | null }) {
  const { sync, database } = useWatermelon();
  const { theme, isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedStrain, setEditedStrain] = useState('');
  const [editedGrowthStage, setEditedGrowthStage] = useState<string>(''); // It's just a string in the model
  const [editedNotes, setEditedNotes] = useState('');
  const [editedHeight, setEditedHeight] = useState<string>(''); // Store as string for TextInput
  const [editedPlantedDate, setEditedPlantedDate] = useState(''); // Store as string
  const [editedIsAuto, setEditedIsAuto] = useState<boolean | undefined>(undefined); // Reinstated
  const [editedIsFem, setEditedIsFem] = useState<boolean | undefined>(undefined); // Reinstated
  const [editedTHC, setEditedTHC] = useState<string>(''); // Reinstated
  const [editedCBD, setEditedCBD] = useState<string>(''); // Reinstated
  const [editedExpectedHarvest, setEditedExpectedHarvest] = useState(''); // Reinstated

  const [newImage, setNewImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Populate state when plant data loads or changes
  useEffect(() => {
    if (plant) {
      setEditedName(plant.name || '');
      setEditedStrain(plant.strain || '');
      setEditedGrowthStage(plant.growthStage || '');
      setEditedNotes(plant.notes || '');
      setEditedHeight(plant.height?.toString() || '');
      setEditedPlantedDate(plant.plantedDate || ''); // Keep as ISO string
      setEditedIsAuto(plant.isAutoFlower); // Reinstated
      setEditedIsFem(plant.isFeminized); // Reinstated
      setEditedTHC(plant.thcContent?.toString() || ''); // Reinstated
      setEditedCBD(plant.cbdContent?.toString() || ''); // Reinstated
      setEditedExpectedHarvest(plant.expectedHarvestDate || ''); // Reinstated
      setNewImage(null); // Reset image changes if plant data reloads
    }
  }, [plant]);

  const handleSave = async () => {
    if (!plant) return;

    // Basic validation (can be expanded)
    if (!editedName.trim()) {
      Alert.alert('Validation Error', 'Plant name cannot be empty.');
      return;
    }
    if (!editedStrain.trim()) {
      Alert.alert('Validation Error', 'Strain cannot be empty.');
      return;
    }
    // Removed GrowthStage enum validation as it's just a string
    if (!editedPlantedDate || !dayjs(editedPlantedDate).isValid()) {
      Alert.alert('Validation Error', 'Please enter a valid planted date (YYYY-MM-DD).');
      return;
    }

    try {
      setIsSaving(true);
      await database.write(async () => {
        await plant.update((record) => {
          record.name = editedName.trim();
          record.strain = editedStrain.trim();
          record.growthStage = editedGrowthStage; // It's just a string
          record.notes = editedNotes.trim();
          // Assign undefined if parsing fails or input is empty for optional numbers
          const heightValue = editedHeight ? parseFloat(editedHeight) : undefined;
          record.height = isNaN(heightValue as number) ? undefined : heightValue;
          record.plantedDate = editedPlantedDate; // Non-optional string
          record.isAutoFlower = editedIsAuto;
          record.isFeminized = editedIsFem;
          const thcValue = editedTHC ? parseFloat(editedTHC) : undefined;
          record.thcContent = isNaN(thcValue as number) ? undefined : thcValue;
          const cbdValue = editedCBD ? parseFloat(editedCBD) : undefined;
          record.cbdContent = isNaN(cbdValue as number) ? undefined : cbdValue;
          // Assign undefined if date is invalid/empty for optional string date
          record.expectedHarvestDate =
            editedExpectedHarvest && dayjs(editedExpectedHarvest).isValid()
              ? editedExpectedHarvest
              : undefined;
          if (newImage) {
            record.imageUrl = newImage;
          }
        });
      });

      sync(); // Sync changes with Supabase
      setIsEditing(false);
      setNewImage(null); // Clear pending image change
      Alert.alert('Success', 'Plant details updated.');
    } catch (error) {
      console.error('Error updating plant:', error);
      Alert.alert('Error', 'Failed to update plant information.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- IMAGE HANDLERS MOVED TO PlantImageSection ---
  // function processAndSetImage(imageUri: string) { ... }
  // async function handleImagePick() { ... }
  // async function handleTakePicture() { ... }

  const handleDelete = async () => {
    if (!plant) return;
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to delete this plant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await plant.markAsDeleted(); // Mark for deletion
                // Optionally, permanently delete if needed: await plant.destroyPermanently();
              });
              sync(); // Sync deletion with Supabase
              router.back();
            } catch (error) {
              console.error('Error deleting plant:', error);
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  };

  // Cancel Edit
  const handleCancelEdit = useCallback(() => {
    if (plant) {
      // Reset state to original plant data
      setEditedName(plant.name || '');
      setEditedStrain(plant.strain || '');
      setEditedGrowthStage(plant.growthStage || '');
      setEditedNotes(plant.notes || '');
      setEditedHeight(plant.height?.toString() || '');
      setEditedPlantedDate(plant.plantedDate || '');
      // Reset reinstated state variables
      setEditedIsAuto(plant.isAutoFlower);
      setEditedIsFem(plant.isFeminized);
      setEditedTHC(plant.thcContent?.toString() || '');
      setEditedCBD(plant.cbdContent?.toString() || '');
      setEditedExpectedHarvest(plant.expectedHarvestDate || '');
      setNewImage(null); // Discard image changes
    }
    setIsEditing(false);
  }, [plant]);

  // Loading state
  if (!plant && !isEditing) {
    // Show loading only if not in edit mode (avoids flicker on save)
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <ActivityIndicator
          size="large"
          color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
        />
        <ThemedText
          className="mt-4 text-center"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          Loading plant details...
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Plant not found state (after observable resolves to null)
  if (!plant && isEditing) {
    // Or handle this case if plant becomes null unexpectedly
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={isDarkMode ? themeColors.status.danger : themeColors.status.danger}
        />
        <ThemedText
          className="mt-4 text-center text-lg font-semibold"
          lightClassName="text-neutral-800"
          darkClassName="text-neutral-100">
          Plant Not Found
        </ThemedText>
        <ThemedText
          className="mt-2 text-center"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-300">
          The requested plant could not be loaded or may have been deleted.
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Ensure plant is not null before proceeding
  if (!plant) return null; // Should be covered by above checks, but good for type safety

  // Render actual content
  return (
    <ThemedView className="flex-1" lightClassName="bg-neutral-50" darkClassName="bg-neutral-900">
      <SafeAreaView edges={['top']} style={{ flex: 0 }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
        {/* Header Buttons */}
        <ThemedView className="absolute left-0 right-0 top-0 z-10 mt-2 flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            className="rounded-full bg-black/30 p-2"
            onPress={() => router.back()}
            accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-row">
            {isEditing ? (
              <>
                <TouchableOpacity
                  className="mr-2 rounded-full bg-green-500 p-2"
                  onPress={handleSave}
                  disabled={isSaving || processingImage}
                  accessibilityLabel="Save changes">
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-full bg-red-500 p-2"
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                  accessibilityLabel="Cancel editing">
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                className="rounded-full bg-black/30 p-2"
                onPress={() => setIsEditing(true)}
                accessibilityLabel="Edit plant details">
                <Ionicons name="pencil" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>

        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {/* --- IMAGE SECTION --- */}
          <PlantImageSection
            initialImageUri={newImage ?? plant?.imageUrl ?? null}
            isEditing={isEditing}
            isDarkMode={isDarkMode}
            theme={theme}
            onImageChange={setNewImage}
          />

          {/* Main Content Area */}
          <ThemedView className="p-4">
            {/* Name and Strain */}
            <ThemedView className="mb-5 items-center">
              {isEditing ? (
                <TextInput
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Plant Name"
                  className="w-full rounded-lg border p-3 text-center text-2xl font-bold"
                  placeholderTextColor={
                    isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                  }
                  style={{
                    borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                    color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                    backgroundColor: isDarkMode
                      ? themeColors.neutral[800]
                      : themeColors.neutral[100],
                  }}
                />
              ) : (
                <ThemedText
                  className="text-center text-3xl font-bold"
                  lightClassName="text-neutral-900"
                  darkClassName="text-neutral-100">
                  {plant.name}
                </ThemedText>
              )}
              {isEditing ? (
                <TextInput
                  value={editedStrain}
                  onChangeText={setEditedStrain}
                  placeholder="Strain Name"
                  className="mt-2 w-full rounded-lg border p-2 text-center text-lg"
                  placeholderTextColor={
                    isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                  }
                  style={{
                    borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                    color: isDarkMode ? themeColors.neutral[200] : themeColors.neutral[700],
                    backgroundColor: isDarkMode
                      ? themeColors.neutral[800]
                      : themeColors.neutral[100],
                  }}
                />
              ) : (
                <ThemedText
                  className="mt-1 text-center text-lg"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  {plant.strain}
                </ThemedText>
              )}
            </ThemedView>

            {/* Details Card */}
            <ThemedView
              className="mb-4 rounded-lg p-4"
              lightClassName="bg-white border border-neutral-200"
              darkClassName="bg-neutral-800 border border-neutral-700">
              <ThemedText
                className="mb-3 text-xl font-semibold"
                lightClassName="text-neutral-800"
                darkClassName="text-neutral-100">
                Details
              </ThemedText>

              {/* Planted Date */}
              <View className="mb-2 flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  Planted Date
                </ThemedText>
                {isEditing ? (
                  <TextInput // Consider using a Date Picker component here
                    value={editedPlantedDate ? dayjs(editedPlantedDate).format('YYYY-MM-DD') : ''} // Format for input
                    onChangeText={(text) =>
                      setEditedPlantedDate(dayjs(text).isValid() ? dayjs(text).toISOString() : '')
                    } // Basic validation
                    placeholder="YYYY-MM-DD"
                    className="rounded border p-1 text-base"
                    keyboardType="numeric" // Or use a date picker
                    placeholderTextColor={
                      isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                    }
                    style={{
                      borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                      color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                      minWidth: 100,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatDate(plant.plantedDate)}
                  </ThemedText>
                )}
              </View>

              {/* Growth Stage */}
              <View className="mb-2 flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  Growth Stage
                </ThemedText>
                {isEditing ? (
                  <TextInput // Consider using a Picker component here
                    value={editedGrowthStage}
                    onChangeText={setEditedGrowthStage}
                    placeholder="e.g., vegetative"
                    className="rounded border p-1 text-base"
                    autoCapitalize="none"
                    placeholderTextColor={
                      isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                    }
                    style={{
                      borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                      color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                      minWidth: 100,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <ThemedText
                    className="text-base font-medium capitalize"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {plant.growthStage}
                  </ThemedText>
                )}
              </View>

              {/* Height */}
              <View className="mb-2 flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  Height
                </ThemedText>
                {isEditing ? (
                  <TextInput
                    value={editedHeight}
                    onChangeText={setEditedHeight}
                    placeholder="cm"
                    keyboardType="numeric"
                    className="rounded border p-1 text-base"
                    placeholderTextColor={
                      isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                    }
                    style={{
                      borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                      color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatNumber(plant.height, ' cm')}
                  </ThemedText>
                )}
              </View>

              {/* Expected Harvest */}
              <View className="flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  Expected Harvest
                </ThemedText>
                {isEditing ? (
                  <TextInput // Consider using a Date Picker component here
                    value={
                      editedExpectedHarvest ? dayjs(editedExpectedHarvest).format('YYYY-MM-DD') : ''
                    }
                    onChangeText={(text) =>
                      setEditedExpectedHarvest(
                        dayjs(text).isValid() ? dayjs(text).toISOString() : ''
                      )
                    }
                    placeholder="YYYY-MM-DD"
                    className="rounded border p-1 text-base"
                    keyboardType="numeric"
                    placeholderTextColor={
                      isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                    }
                    style={{
                      borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                      color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                      minWidth: 100,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatDate(plant.expectedHarvestDate)}
                  </ThemedText>
                )}
              </View>
            </ThemedView>

            {/* Genetics Card */}
            <ThemedView
              className="mb-4 rounded-lg p-4"
              lightClassName="bg-white border border-neutral-200"
              darkClassName="bg-neutral-800 border border-neutral-700">
              <ThemedText
                className="mb-3 text-xl font-semibold"
                lightClassName="text-neutral-800"
                darkClassName="text-neutral-100">
                Genetics
              </ThemedText>
              {/* Auto Flower */}
              <View className="mb-2 flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  Auto Flower
                </ThemedText>
                {isEditing ? (
                  <TouchableOpacity onPress={() => setEditedIsAuto(!editedIsAuto)} className="p-1">
                    <MaterialCommunityIcons
                      name={editedIsAuto ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={24}
                      color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
                    />
                  </TouchableOpacity>
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatBoolean(plant.isAutoFlower)}
                  </ThemedText>
                )}
              </View>
              {/* Feminized */}
              <View className="mb-2 flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  Feminized
                </ThemedText>
                {isEditing ? (
                  <TouchableOpacity onPress={() => setEditedIsFem(!editedIsFem)} className="p-1">
                    <MaterialCommunityIcons
                      name={editedIsFem ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={24}
                      color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
                    />
                  </TouchableOpacity>
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatBoolean(plant.isFeminized)}
                  </ThemedText>
                )}
              </View>
              {/* THC Content */}
              <View className="mb-2 flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  THC Content
                </ThemedText>
                {isEditing ? (
                  <TextInput
                    value={editedTHC}
                    onChangeText={setEditedTHC}
                    placeholder="%"
                    keyboardType="numeric"
                    className="rounded border p-1 text-base"
                    placeholderTextColor={
                      isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                    }
                    style={{
                      borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                      color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatNumber(plant.thcContent, '%')}
                  </ThemedText>
                )}
              </View>
              {/* CBD Content */}
              <View className="flex-row items-center justify-between">
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-600"
                  darkClassName="text-neutral-300">
                  CBD Content
                </ThemedText>
                {isEditing ? (
                  <TextInput
                    value={editedCBD}
                    onChangeText={setEditedCBD}
                    placeholder="%"
                    keyboardType="numeric"
                    className="rounded border p-1 text-base"
                    placeholderTextColor={
                      isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                    }
                    style={{
                      borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                      color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  />
                ) : (
                  <ThemedText
                    className="text-base font-medium"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-100">
                    {formatNumber(plant.cbdContent, '%')}
                  </ThemedText>
                )}
              </View>
            </ThemedView>

            {/* Notes Card */}
            <ThemedView
              className="mb-4 rounded-lg p-4"
              lightClassName="bg-white border border-neutral-200"
              darkClassName="bg-neutral-800 border border-neutral-700">
              <ThemedText
                className="mb-2 text-xl font-semibold"
                lightClassName="text-neutral-800"
                darkClassName="text-neutral-100">
                Notes
              </ThemedText>
              {isEditing ? (
                <TextInput
                  value={editedNotes}
                  onChangeText={setEditedNotes}
                  placeholder="Add notes about your plant..."
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  className="rounded-lg border p-3 text-base leading-relaxed"
                  placeholderTextColor={
                    isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]
                  }
                  style={{
                    borderColor: isDarkMode ? themeColors.neutral[600] : themeColors.neutral[300],
                    color: isDarkMode ? themeColors.neutral[100] : themeColors.neutral[900],
                    backgroundColor: isDarkMode
                      ? themeColors.neutral[800]
                      : themeColors.neutral[100],
                    minHeight: 100, // Ensure decent height for multiline
                  }}
                />
              ) : (
                <ThemedText
                  className="text-base leading-relaxed"
                  lightClassName="text-neutral-700"
                  darkClassName="text-neutral-200">
                  {plant.notes || 'No notes added yet.'}
                </ThemedText>
              )}
            </ThemedView>

            {/* Actions Card */}
            <ThemedView
              className="mb-4 rounded-lg p-4"
              lightClassName="bg-white border border-neutral-200"
              darkClassName="bg-neutral-800 border border-neutral-700">
              <TouchableOpacity
                className="flex-row items-center py-3"
                onPress={() => router.push(`/plant/diary/${plant.id}`)}
                accessibilityLabel="Open grow journal">
                <Ionicons
                  name="journal-outline"
                  size={24}
                  color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
                />
                <ThemedText
                  className="ml-3 text-lg"
                  lightClassName="text-neutral-800"
                  darkClassName="text-neutral-100">
                  Grow Journal
                </ThemedText>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDarkMode ? themeColors.neutral[400] : themeColors.neutral[500]}
                  className="ml-auto"
                />
              </TouchableOpacity>

              {/* Add Metrics Link/Button Here Later */}
              <View
                className="my-2 border-t"
                style={{
                  borderColor: isDarkMode ? themeColors.neutral[700] : themeColors.neutral[200],
                }}
              />

              <TouchableOpacity
                className="flex-row items-center py-3"
                onPress={() =>
                  Alert.alert('Coming Soon', 'Plant metrics tracking will be available soon.')
                }
                accessibilityLabel="View plant metrics (coming soon)">
                <Ionicons
                  name="stats-chart-outline"
                  size={24}
                  color={isDarkMode ? themeColors.neutral[500] : themeColors.neutral[400]}
                />
                <ThemedText
                  className="ml-3 text-lg"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400">
                  Metrics
                </ThemedText>
                <ThemedText
                  className="ml-auto text-sm"
                  lightClassName="text-neutral-400"
                  darkClassName="text-neutral-500">
                  (Coming Soon)
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {/* Delete Button (only in edit mode) */}
            {isEditing && (
              <TouchableOpacity
                className="mt-6 items-center rounded-lg border border-red-600/30 bg-red-600/10 p-3"
                onPress={handleDelete}
                disabled={isSaving}
                accessibilityLabel="Delete this plant">
                <ThemedText className="font-bold text-red-600">Delete Plant</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// --- HOCs and Wrapper ---

// 1. Enhance with database
const PlantDetailsWithDB = withDatabase(PlantDetailsScreenBase);

// 2. Enhance with observables
const PlantDetailsEnhanced = withObservables(
  ['route', 'database'], // Depend on route and database props
  ({ database, route }: { database: Database; route: any }) => {
    const id = route?.params?.id as string | undefined;

    if (!database || !id) {
      console.error('[withObservables] Database or Plant ID missing.', {
        hasDb: !!database,
        hasId: !!id,
      });
      return { plant: null }; // Return null observable if DB or ID is missing
    }

    try {
      // Observe a single record by ID
      const plantObservable = database.collections.get<Plant>('plants').findAndObserve(id);

      // WORKAROUND: Instead of using the relationship directly, we'll manually fetch the strain
      // This bypasses the relationship issue between 'plants' and 'strains'
      return {
        plant: plantObservable,
      };
    } catch (error) {
      console.error(`[withObservables] Error observing plant with ID ${id}:`, error);
      return { plant: null }; // Return null observable on error
    }
  }
)(PlantDetailsWithDB);

// Wrapper component to handle route params and render the enhanced screen
export default function PlantDetailsWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { database } = useDatabase(); // Get database from context
  const { isDarkMode } = useTheme(); // Get theme info for loading/error states

  // ID Missing State
  if (!id) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={isDarkMode ? themeColors.status.warning : themeColors.status.warning}
        />
        <ThemedText
          className="mt-4 text-center text-lg font-semibold"
          lightClassName="text-neutral-800"
          darkClassName="text-neutral-100">
          Missing Information
        </ThemedText>
        <ThemedText
          className="mt-2 text-center"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-300">
          No Plant ID was provided to view details.
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Database Loading State
  if (!database) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-neutral-50"
        darkClassName="bg-neutral-900">
        <ActivityIndicator
          size="large"
          color={isDarkMode ? themeColors.primary[400] : themeColors.primary[500]}
        />
        <ThemedText
          className="mt-4 text-center"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          Connecting to database...
        </ThemedText>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <ThemedText className="font-medium text-white">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Render the enhanced component, passing route params and database
  // Key prop helps React re-mount if ID changes, ensuring observable updates
  return <PlantDetailsEnhanced key={id} route={{ params: { id } }} database={database} />;
}
