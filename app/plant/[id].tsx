import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Database, Q } from '@nozbe/watermelondb'; // Import Q
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
// We need the map operator from rxjs
import { map } from 'rxjs/operators';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../lib/contexts/ThemeContext';
import { useDatabase } from '../../lib/contexts/DatabaseProvider'; // Import useDatabase hook
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Plant } from '../../lib/models/Plant';
// import supabase from '../../lib/supabase'; // supabase is unused

// Base component that receives the plant from withObservables
function PlantDetailsScreenBase({ plant }: { plant: Plant | null }) {
  const { sync, database } = useWatermelon();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(plant?.name || '');
  const [editedStrain, setEditedStrain] = useState(plant?.strain || '');
  const [editedGrowthStage, setEditedGrowthStage] = useState(plant?.growthStage || '');
  const [editedNotes, setEditedNotes] = useState(plant?.notes || '');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Update form when plant data changes from observable
  React.useEffect(() => {
    if (plant) {
      setEditedName(plant.name);
      setEditedStrain(plant.strain);
      setEditedGrowthStage(plant.growthStage);
      setEditedNotes(plant.notes || '');
      
      // Log the image URL for debugging
      console.log(`Plant image URL: ${plant.imageUrl || 'None'}`);
    }
  }, [plant]);

  // Rest of the component code remains largely the same...

  // Handle the case where plant is null (still loading or not found)
  if (!plant) {
    return (
      <SafeAreaView className="flex-1 bg-white p-4">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text className="mt-4 text-center text-gray-500">Loading plant details...</Text>
          <TouchableOpacity 
            className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
            onPress={() => router.back()}
          >
            <Text className="text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!plant) return;

    try {
      setIsSaving(true);
      
      // Use database from the component level
      // Use a database.write transaction instead of direct plant.update
      await database.write(async () => {
        await plant.update((record) => {
          record.name = editedName;
          record.strain = editedStrain;
          record.growthStage = editedGrowthStage;
          record.notes = editedNotes;
          // If we have a new image path from the picker, update it
          if (newImage) {
            // Store the full URI path to the processed image
            record.imageUrl = newImage;
          }
        });
      });

      // After successful update, trigger sync to update Supabase
      sync(); 
      setIsEditing(false);
      setNewImage(null);
    } catch (error) {
      console.error('Error updating plant:', error);
      Alert.alert('Error', 'Failed to update plant information');
    } finally {
      setIsSaving(false);
    }
  };

  // Process and optimize images using ImageManipulator
const processAndSetImage = async (imageUri: string) => {
  try {
    setProcessingImage(true);
    console.log('Processing image from URI:', imageUri);
    
    // Resize and compress the image for better performance
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 800, height: 800 } }, // Resize to reasonable dimensions
      ],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Moderate compression
    );
    
    console.log('Image processed successfully. New URI:', manipResult.uri);
    // Set the processed image URI
    setNewImage(manipResult.uri);
  } catch (error) {
    console.error('Error processing image:', error);
    Alert.alert('Error', 'Failed to process image');
  } finally {
    setProcessingImage(false);
  }
};

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
              // Use database from component level
              // Use a write transaction
              await database.write(async () => {
                await plant.markAsDeleted();
              });
              
              sync(); // Sync with Supabase to delete remotely too
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

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use MediaTypeOptions which is the correct API
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        // Process the image before setting it
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePicture = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take pictures');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use MediaTypeOptions which is the correct API
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        // Process the image before setting it
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  // The rest of your existing UI rendering code would go here...
  // You can keep the existing UI code with minimal changes

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        <View className="relative">
          {/* Image Section */}
          <View className="h-64 w-full bg-gray-200">
            {(plant.imageUrl || newImage) ? (
              <Image
                source={{ uri: newImage || plant.imageUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <FontAwesome5 name="cannabis" size={64} color="#9ca3af" />
                <Text className="mt-2 text-gray-500">No image available</Text>
              </View>
            )}
            {processingImage && (
              <View className="absolute inset-0 bg-black bg-opacity-50 items-center justify-center">
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-2 text-white">Processing image...</Text>
              </View>
            )}
          </View>

          {/* Back Button */}
          <TouchableOpacity
            className="absolute left-4 top-4 rounded-full bg-black/30 p-2"
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Edit Button */}
          <View className="absolute right-4 top-4 flex-row">
            {isEditing ? (
              <>
                <TouchableOpacity
                  className="mr-2 rounded-full bg-green-500 p-2"
                  onPress={handleSave}
                  disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-full bg-red-500 p-2"
                  onPress={() => {
                    setIsEditing(false);
                    setEditedName(plant.name);
                    setEditedStrain(plant.strain);
                    setEditedGrowthStage(plant.growthStage);
                    setEditedNotes(plant.notes || '');
                    setNewImage(null);
                  }}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  className="rounded-full bg-black/30 p-2"
                  onPress={() => setIsEditing(true)}>
                  <Ionicons name="pencil" size={24} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Camera buttons (only in edit mode) */}
          {isEditing && (
            <View className="absolute bottom-4 right-4 flex-row">
              <TouchableOpacity
                className="mr-2 rounded-full bg-black/30 p-2"
                onPress={handleTakePicture}>
                <Ionicons name="camera" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="rounded-full bg-black/30 p-2" onPress={handleImagePick}>
                <Ionicons name="image" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-200">
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === 'info' ? 'border-b-2 border-green-500' : ''}`}
            onPress={() => setActiveTab('info')}>
            <Text
              className={`text-center ${activeTab === 'info' ? 'font-bold text-green-500' : 'text-gray-500'}`}>
              Info
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === 'diary' ? 'border-b-2 border-green-500' : ''}`}
            onPress={() => setActiveTab('diary')}>
            <Text
              className={`text-center ${activeTab === 'diary' ? 'font-bold text-green-500' : 'text-gray-500'}`}>
              Diary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === 'metrics' ? 'border-b-2 border-green-500' : ''}`}
            onPress={() => setActiveTab('metrics')}>
            <Text
              className={`text-center ${activeTab === 'metrics' ? 'font-bold text-green-500' : 'text-gray-500'}`}>
              Metrics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        <View className="p-4">
          {activeTab === 'info' && (
            <View>
              <View className="mb-4">
                <Text className="mb-1 text-sm text-gray-500">Plant Name</Text>
                {isEditing ? (
                  <TextInput
                    className="rounded-lg border border-gray-300 p-2"
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Plant Name"
                  />
                ) : (
                  <Text className="text-xl font-bold">{plant.name}</Text>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-sm text-gray-500">Strain</Text>
                {isEditing ? (
                  <TextInput
                    className="rounded-lg border border-gray-300 p-2"
                    value={editedStrain}
                    onChangeText={setEditedStrain}
                    placeholder="Strain"
                  />
                ) : (
                  <Text className="text-lg">{plant.strain}</Text>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-sm text-gray-500">Growth Stage</Text>
                {isEditing ? (
                  <TextInput
                    className="rounded-lg border border-gray-300 p-2"
                    value={editedGrowthStage}
                    onChangeText={setEditedGrowthStage}
                    placeholder="Growth Stage"
                  />
                ) : (
                  <Text className="text-lg">{plant.growthStage}</Text>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-sm text-gray-500">Notes</Text>
                {isEditing ? (
                  <TextInput
                    className="rounded-lg border border-gray-300 p-2"
                    value={editedNotes}
                    onChangeText={setEditedNotes}
                    placeholder="Notes"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                ) : (
                  <Text className="text-base">{plant.notes || 'No notes'}</Text>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-sm text-gray-500">Planted Date</Text>
                <Text className="text-base">{plant.plantedDate || 'Unknown'}</Text>
              </View>

              {/* Delete button (only in edit mode) */}
              {isEditing && (
                <TouchableOpacity
                  className="mt-6 items-center rounded-lg bg-red-100 p-3"
                  onPress={handleDelete}>
                  <Text className="font-bold text-red-600">Delete Plant</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'diary' && (
            <TouchableOpacity
              className="items-center rounded-lg border border-green-200 bg-green-50 p-4"
              onPress={() => router.push(`/plant/diary/${plant.id}`)}>
              <Ionicons name="journal-outline" size={36} color={theme.colors.primary[500]} />
              <Text className="mt-2 text-lg font-semibold">Open Grow Journal</Text>
              <Text className="mt-1 text-center text-gray-500">
                Keep track of watering, feeding, and all your plant activities
              </Text>
            </TouchableOpacity>
          )}

          {activeTab === 'metrics' && (
            <View className="items-center justify-center py-8">
              <Ionicons name="stats-chart" size={48} color="#9ca3af" />
              <Text className="mt-2 text-lg font-semibold">Metrics Coming Soon</Text>
              <Text className="mt-1 text-center text-gray-500">
                Track height, width, yield, and other measurements
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Apply HOCs in the correct order: withDatabase first, then withObservables

// 1. Enhance the base component with the database prop
const PlantDetailsWithDB = withDatabase(PlantDetailsScreenBase);

// 2. Enhance the component with observables
const PlantDetailsEnhanced = withObservables(
  ['route', 'database'], // Observe changes based on both route and database props
  ({ database, route }: { database: Database; route: any }) => {
    const id = route?.params?.id; // Get the plant ID from route params

    // Ensure database and id are available before attempting to query
    if (!database) {
      console.error('[withObservables] Database is missing');
      return { plant: null }; // Return null props if database isn't available
    }

    if (!id) {
      console.error('[withObservables] Plant ID is missing');
      return { plant: null }; // Return null props if ID isn't available
    }

    try {
      console.log(`[withObservables] Querying plant with ID: ${id}`);
      
      // Use query().observe() which returns Observable<Model[]>
      const plantCollection = database.get<Plant>('plants');
      
      // Verify the collection exists
      if (!plantCollection) {
        console.error('[withObservables] Plant collection not found in database');
        return { plant: null };
      }
      
      const plantObservable = plantCollection
        .query(Q.where('id', id))
        .observe();

      // Map the Observable<Plant[]> to Observable<Plant | null>
      return {
        plant: plantObservable.pipe(
          map((plants) => {
            if (plants.length === 0) {
              console.log(`[withObservables] No plant found with ID: ${id}`);
              return null;
            }
            console.log(`[withObservables] Found plant with ID: ${id}`);
            return plants[0];
          })
        ),
      };
    } catch (error) {
      console.error('[withObservables] Error creating plant observable:', error);
      return { plant: null };
    }
  }
)(PlantDetailsWithDB); // Pass the database-enhanced component here

// Wrapper component to handle route parameters and render the enhanced screen
export default function PlantDetailsWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string; // Get the ID from local search params
  const { database } = useDatabase(); // Get database from context

  // Ensure we have a valid ID before rendering the enhanced component
  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-white p-4">
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-red-500">Plant ID is missing</Text>
          <TouchableOpacity 
            className="mt-4 rounded-lg bg-primary-500 px-4 py-2"
            onPress={() => router.back()}
          >
            <Text className="text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Ensure database is available
  if (!database) {
    return (
      <SafeAreaView className="flex-1 bg-white p-4">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-4 text-center text-gray-500">Connecting to database...</Text>
          <TouchableOpacity 
            className="mt-6 rounded-lg bg-primary-500 px-4 py-2"
            onPress={() => router.back()}
          >
            <Text className="text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Pass both the route params and database down to the enhanced component
  return <PlantDetailsEnhanced route={{ params: { id } }} database={database} />;
}
