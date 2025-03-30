import React, { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plant } from '../../lib/models/Plant';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import supabase from '../../lib/supabase';
import { useTheme } from '../../lib/contexts/ThemeContext';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Database, Q } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';

// Base component that receives the plant from withObservables
function PlantDetailsScreenBase({ plant }: { plant: Plant | null }) {
  const { sync } = useWatermelon();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(plant?.name || '');
  const [editedStrain, setEditedStrain] = useState(plant?.strain || '');
  const [editedGrowthStage, setEditedGrowthStage] = useState(plant?.growthStage || '');
  const [editedNotes, setEditedNotes] = useState(plant?.notes || '');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Update form when plant data changes from observable
  React.useEffect(() => {
    if (plant) {
      setEditedName(plant.name);
      setEditedStrain(plant.strain);
      setEditedGrowthStage(plant.growthStage);
      setEditedNotes(plant.notes || '');
    }
  }, [plant]);

  // Rest of the component code remains largely the same...
  
  // Handle the case where plant is null (still loading or not found)
  if (!plant) {
    return (
      <SafeAreaView className="flex-1 p-4 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text className="mt-4 text-center text-gray-500">Loading plant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!plant) return;
    
    try {
      setIsSaving(true);
      
      await plant.update((record) => {
        record.name = editedName;
        record.strain = editedStrain;
        record.growthStage = editedGrowthStage;
        record.notes = editedNotes;
        // If we have a new image path from the picker, update it
        if (newImage) {
          record.imageUrl = newImage;
        }
      });
      
      sync(); // Trigger sync to update Supabase
      setIsEditing(false);
      setNewImage(null);
    } catch (error) {
      console.error('Error updating plant:', error);
      Alert.alert('Error', 'Failed to update plant information');
    } finally {
      setIsSaving(false);
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
              await plant.markAsDeleted();
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setNewImage(result.assets[0].uri);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setNewImage(result.assets[0].uri);
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
              <View className="h-full w-full justify-center items-center">
                <FontAwesome5 name="cannabis" size={64} color="#9ca3af" />
                <Text className="mt-2 text-gray-500">No image available</Text>
              </View>
            )}
          </View>
          
          {/* Back Button */}
          <TouchableOpacity
            className="absolute top-4 left-4 bg-black/30 rounded-full p-2"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Edit Button */}
          <View className="absolute top-4 right-4 flex-row">
            {isEditing ? (
              <>
                <TouchableOpacity
                  className="bg-green-500 rounded-full p-2 mr-2"
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-red-500 rounded-full p-2"
                  onPress={() => {
                    setIsEditing(false);
                    setEditedName(plant.name);
                    setEditedStrain(plant.strain);
                    setEditedGrowthStage(plant.growthStage);
                    setEditedNotes(plant.notes || '');
                    setNewImage(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  className="bg-black/30 rounded-full p-2"
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="pencil" size={24} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>
          
          {/* Camera buttons (only in edit mode) */}
          {isEditing && (
            <View className="absolute bottom-4 right-4 flex-row">
              <TouchableOpacity
                className="bg-black/30 rounded-full p-2 mr-2"
                onPress={handleTakePicture}
              >
                <Ionicons name="camera" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-black/30 rounded-full p-2"
                onPress={handleImagePick}
              >
                <Ionicons name="image" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Tabs */}
        <View className="flex-row border-b border-gray-200">
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === 'info' ? 'border-b-2 border-green-500' : ''}`}
            onPress={() => setActiveTab('info')}
          >
            <Text className={`text-center ${activeTab === 'info' ? 'text-green-500 font-bold' : 'text-gray-500'}`}>Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === 'diary' ? 'border-b-2 border-green-500' : ''}`}
            onPress={() => setActiveTab('diary')}
          >
            <Text className={`text-center ${activeTab === 'diary' ? 'text-green-500 font-bold' : 'text-gray-500'}`}>Diary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === 'metrics' ? 'border-b-2 border-green-500' : ''}`}
            onPress={() => setActiveTab('metrics')}
          >
            <Text className={`text-center ${activeTab === 'metrics' ? 'text-green-500 font-bold' : 'text-gray-500'}`}>Metrics</Text>
          </TouchableOpacity>
        </View>
        
        {/* Content based on active tab */}
        <View className="p-4">
          {activeTab === 'info' && (
            <View>
              <View className="mb-4">
                <Text className="text-gray-500 text-sm mb-1">Plant Name</Text>
                {isEditing ? (
                  <TextInput
                    className="border border-gray-300 rounded-lg p-2"
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Plant Name"
                  />
                ) : (
                  <Text className="text-xl font-bold">{plant.name}</Text>
                )}
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-500 text-sm mb-1">Strain</Text>
                {isEditing ? (
                  <TextInput
                    className="border border-gray-300 rounded-lg p-2"
                    value={editedStrain}
                    onChangeText={setEditedStrain}
                    placeholder="Strain"
                  />
                ) : (
                  <Text className="text-lg">{plant.strain}</Text>
                )}
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-500 text-sm mb-1">Growth Stage</Text>
                {isEditing ? (
                  <TextInput
                    className="border border-gray-300 rounded-lg p-2"
                    value={editedGrowthStage}
                    onChangeText={setEditedGrowthStage}
                    placeholder="Growth Stage"
                  />
                ) : (
                  <Text className="text-lg">{plant.growthStage}</Text>
                )}
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-500 text-sm mb-1">Notes</Text>
                {isEditing ? (
                  <TextInput
                    className="border border-gray-300 rounded-lg p-2"
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
                <Text className="text-gray-500 text-sm mb-1">Planted Date</Text>
                <Text className="text-base">{plant.plantedDate || 'Unknown'}</Text>
              </View>
              
              {/* Delete button (only in edit mode) */}
              {isEditing && (
                <TouchableOpacity
                  className="bg-red-100 p-3 rounded-lg mt-6 items-center"
                  onPress={handleDelete}
                >
                  <Text className="text-red-600 font-bold">Delete Plant</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {activeTab === 'diary' && (
            <TouchableOpacity
              className="bg-green-50 border border-green-200 rounded-lg p-4 items-center"
              onPress={() => router.push(`/plant/diary/${plant.id}`)}
            >
              <Ionicons name="journal-outline" size={36} color={theme.colors.primary[500]} />
              <Text className="text-lg font-semibold mt-2">Open Grow Journal</Text>
              <Text className="text-center text-gray-500 mt-1">
                Keep track of watering, feeding, and all your plant activities
              </Text>
            </TouchableOpacity>
          )}
          
          {activeTab === 'metrics' && (
            <View className="items-center justify-center py-8">
              <Ionicons name="stats-chart" size={48} color="#9ca3af" />
              <Text className="text-lg font-semibold mt-2">Metrics Coming Soon</Text>
              <Text className="text-center text-gray-500 mt-1">
                Track height, width, yield, and other measurements
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Higher-order component to enhance with database
const PlantDetailsScreenWithDatabase = withDatabase(PlantDetailsScreenBase);

// Enhance with observables
const PlantDetailsScreen = withObservables(['route'], ({ database, route }: { database: Database, route: any }) => {
  const id = route?.params?.id;
  
  return {
    // Return null if id is not available
    plant: id ? database.get<Plant>('plants').findAndObserve(id) : null
  };
})(PlantDetailsScreenWithDatabase);

export default function PlantDetailsWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  
  return <PlantDetailsScreen route={{ params: { id } }} />;
}
