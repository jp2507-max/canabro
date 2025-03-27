import React, { useEffect, useState } from 'react';
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
import { Q } from '@nozbe/watermelondb';

export default function PlantDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { plants, sync } = useWatermelon();
  const { theme } = useTheme();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedStrain, setEditedStrain] = useState('');
  const [editedGrowthStage, setEditedGrowthStage] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchPlant();
  }, [id]);

  const fetchPlant = async () => {
    try {
      setIsLoading(true);
      if (!id) return;

      // Find the plant by its ID using WatermelonDB's find method
      const plantRecord = await plants.find(id as string);
      
      setPlant(plantRecord);
      setEditedName(plantRecord.name);
      setEditedStrain(plantRecord.strain);
      setEditedGrowthStage(plantRecord.growthStage);
      setEditedNotes(plantRecord.notes || '');
    } catch (error) {
      console.error('Error fetching plant:', error);
      
      // Try to find by plantId instead of id
      try {
        const plantsWithMatchingId = await plants.query(
          Q.where('plant_id', id as string)
        ).fetch();
        
        if (plantsWithMatchingId.length > 0) {
          const plantRecord = plantsWithMatchingId[0];
          
          setPlant(plantRecord);
          setEditedName(plantRecord.name);
          setEditedStrain(plantRecord.strain);
          setEditedGrowthStage(plantRecord.growthStage);
          setEditedNotes(plantRecord.notes || '');
        } else {
          Alert.alert('Error', 'Failed to load plant details.');
        }
      } catch (secondError) {
        console.error('Error fetching plant by plantId:', secondError);
        Alert.alert('Error', 'Failed to load plant details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
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
              if (!plant) return;
              
              // Use WatermelonDB's database.write method
              await plant.database.write(async () => {
                await plant.markAsDeleted();
              });
              
              Alert.alert('Success', 'Plant deleted successfully');
              
              // Trigger sync to update Supabase
              await sync();
              
              router.back();
            } catch (error) {
              console.error('Error deleting plant:', error);
              Alert.alert('Error', 'Failed to delete plant');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your photo library to upload images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setNewImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!newImage) return null;
    
    try {
      setIsUploadingImage(true);
      
      // Read the file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(newImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Generate a unique filename
      const filename = `plant_${Date.now()}.jpg`;
      const filePath = `${userId}/${filename}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('plants')
        .upload(filePath, fileBase64, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) {
        console.error('Supabase storage error:', error);
        return null;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('plants')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!plant) return;
    
    if (!editedName || !editedStrain) {
      Alert.alert('Missing Information', 'Please provide a name and strain for your plant.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in to update a plant.');
        return;
      }

      // Upload new image if selected
      let imageUrl = null;
      if (newImage) {
        imageUrl = await uploadImage(user.id);
      }

      // Update plant in database
      await plant.database.write(async () => {
        await plant.update((p: Plant) => {
          p.name = editedName;
          p.strain = editedStrain;
          p.growthStage = editedGrowthStage;
          p.notes = editedNotes;
          if (imageUrl) {
            p.imageUrl = imageUrl;
          }
        });
      });

      setIsEditing(false);
      setNewImage(null);
      fetchPlant(); // Refresh plant data
      
      Alert.alert('Success', 'Plant updated successfully!');
    } catch (error) {
      console.error('Error updating plant:', error);
      Alert.alert('Error', 'Failed to update plant. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const showActions = () => {
    Alert.alert(
      'Plant Options',
      undefined,
      [
        { 
          text: 'Edit Details', 
          onPress: () => setIsEditing(true) 
        },
        { 
          text: 'View Diary', 
          onPress: () => router.push(`/plant/diary/${id}`) 
        },
        { 
          text: 'View Gallery', 
          onPress: () => console.log('View gallery') 
        },
        { 
          text: 'Track Progress', 
          onPress: () => console.log('Track progress') 
        },
        { 
          text: 'Share', 
          onPress: () => console.log('Share') 
        },
        { 
          text: 'Get Expert Help', 
          onPress: () => console.log('Get expert help') 
        },
        { 
          text: 'Remove this Plant', 
          style: 'destructive',
          onPress: handleDelete 
        },
        { 
          text: 'Cancel', 
          style: 'cancel'
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-primary-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView className="flex-1 bg-primary-50">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl text-gray-600">Plant not found</Text>
          <TouchableOpacity 
            className="mt-4 bg-primary-500 px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-2">
        <TouchableOpacity 
          className="h-10 w-10 rounded-full bg-white justify-center items-center shadow"
          onPress={() => router.back()}
          style={theme.shadows.sm}
        >
          <Ionicons name="close" size={22} color={theme.colors.neutral[800]} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="h-10 w-10 rounded-full bg-white justify-center items-center shadow"
          onPress={showActions}
          style={theme.shadows.sm}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.neutral[800]} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Plant Header */}
        <View className="px-4 py-2 items-center">
          <Text className="text-3xl font-bold text-neutral-900">{plant.name}</Text>
          <Text className="text-sm uppercase tracking-wide text-neutral-500 mt-1">{plant.strain}</Text>
        </View>

        {/* Plant Image */}
        <View className="px-8 py-4">
          {isEditing ? (
            <TouchableOpacity 
              className="aspect-square bg-white rounded-3xl shadow overflow-hidden"
              onPress={pickImage}
              disabled={isUploadingImage}
              style={theme.shadows.md}
            >
              {isUploadingImage ? (
                <View className="w-full h-full justify-center items-center">
                  <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
              ) : newImage ? (
                <Image source={{ uri: newImage }} className="w-full h-full" resizeMode="cover" />
              ) : plant.imageUrl ? (
                <Image source={{ uri: plant.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full justify-center items-center">
                  <Ionicons name="camera-outline" size={48} color={theme.colors.neutral[400]} />
                  <Text className="text-neutral-500 mt-2">Tap to add a photo</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View 
              className="aspect-square bg-white rounded-3xl shadow overflow-hidden"
              style={theme.shadows.md}
            >
              {plant.imageUrl ? (
                <Image source={{ uri: plant.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full justify-center items-center">
                  <Ionicons name="leaf-outline" size={48} color={theme.colors.neutral[400]} />
                  <Text className="text-neutral-500">No Image</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Plant Status */}
        {!isEditing && (
          <View className="mx-4 my-2 p-4 bg-white rounded-2xl flex-row items-center shadow" style={theme.shadows.sm}>
            <View className="h-12 w-12 bg-primary-100 rounded-full justify-center items-center mr-3">
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary[500]} />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-lg text-neutral-900">I'm good to go</Text>
              <Text className="text-neutral-500">All caught up on plant care!</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        {!isEditing && (
          <View className="mx-4 my-2">
            <Text className="font-semibold text-lg text-neutral-800 mb-2">Quick Actions</Text>
            <View className="flex-row flex-wrap">
              <TouchableOpacity 
                className="bg-white p-3 rounded-xl m-1 flex-row items-center shadow"
                style={[{ width: '48%' }, theme.shadows.sm]}
                onPress={() => router.push(`/plant/diary/${id}`)}
              >
                <View className="h-10 w-10 bg-primary-100 rounded-full justify-center items-center mr-2">
                  <Ionicons name="journal-outline" size={20} color={theme.colors.primary[500]} />
                </View>
                <Text className="font-medium text-neutral-800">Plant Diary</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white p-3 rounded-xl m-1 flex-row items-center shadow"
                style={[{ width: '48%' }, theme.shadows.sm]}
                onPress={() => console.log('Water plant')}
              >
                <View className="h-10 w-10 bg-blue-100 rounded-full justify-center items-center mr-2">
                  <Ionicons name="water-outline" size={20} color={theme.colors.special.watering || "#0ea5e9"} />
                </View>
                <Text className="font-medium text-neutral-800">Water</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white p-3 rounded-xl m-1 flex-row items-center shadow"
                style={[{ width: '48%' }, theme.shadows.sm]}
                onPress={() => console.log('Feed plant')}
              >
                <View className="h-10 w-10 bg-amber-100 rounded-full justify-center items-center mr-2">
                  <Ionicons name="flask-outline" size={20} color={theme.colors.special.feeding || "#f59e0b"} />
                </View>
                <Text className="font-medium text-neutral-800">Feed</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white p-3 rounded-xl m-1 flex-row items-center shadow"
                style={[{ width: '48%' }, theme.shadows.sm]}
                onPress={() => console.log('Add task')}
              >
                <View className="h-10 w-10 bg-neutral-100 rounded-full justify-center items-center mr-2">
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.neutral[600]} />
                </View>
                <Text className="font-medium text-neutral-800">Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Edit Form */}
        {isEditing && (
          <View className="px-4 py-2 mb-4">
            <View className="mb-4">
              <Text className="font-medium text-neutral-700 mb-1">Name</Text>
              <TextInput
                className="bg-white p-3 rounded-xl border border-neutral-200"
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Plant name"
              />
            </View>

            <View className="mb-4">
              <Text className="font-medium text-neutral-700 mb-1">Strain</Text>
              <TextInput
                className="bg-white p-3 rounded-xl border border-neutral-200"
                value={editedStrain}
                onChangeText={setEditedStrain}
                placeholder="Strain name"
              />
            </View>

            <View className="mb-4">
              <Text className="font-medium text-neutral-700 mb-1">Growth Stage</Text>
              <TextInput
                className="bg-white p-3 rounded-xl border border-neutral-200"
                value={editedGrowthStage}
                onChangeText={setEditedGrowthStage}
                placeholder="e.g., Vegetative, Flowering"
              />
            </View>

            <View className="mb-4">
              <Text className="font-medium text-neutral-700 mb-1">Notes</Text>
              <TextInput
                className="bg-white p-3 rounded-xl border border-neutral-200"
                value={editedNotes}
                onChangeText={setEditedNotes}
                placeholder="Any notes about your plant"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row justify-end mt-4">
              <TouchableOpacity 
                className="px-4 py-2 rounded-full border border-primary-500 mr-3"
                onPress={() => {
                  setIsEditing(false);
                  setNewImage(null);
                  setEditedName(plant.name);
                  setEditedStrain(plant.strain);
                  setEditedGrowthStage(plant.growthStage);
                  setEditedNotes(plant.notes || '');
                }}
              >
                <Text className="text-primary-500 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="px-5 py-2 rounded-full bg-primary-500"
                onPress={handleSave}
                disabled={isSaving || isUploadingImage}
              >
                {isSaving || isUploadingImage ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Tabs */}
        {!isEditing && (
          <>
            {/* Tab Navigation */}
            <View className="mt-2 px-4">
              <View className="flex-row mb-4 flex-wrap">
                {['info', 'water', 'light', 'toxicity', 'humidity'].map((tab) => (
                  <Pressable
                    key={tab}
                    className={`px-3 py-2 mx-1 mb-2 rounded-full border ${activeTab === tab ? 'bg-primary-300 border-primary-300' : 'bg-white border-neutral-200'}`}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text 
                      className={`capitalize ${activeTab === tab ? 'text-primary-800 font-medium' : 'text-neutral-700'}`}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Tab Content */}
            <View className="px-4 mb-20">
              {activeTab === 'info' && (
                <View className="bg-white rounded-xl shadow p-4" style={theme.shadows.sm}>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-lg font-semibold">Plant Details</Text>
                  </View>
                  <View className="border-b border-neutral-100 pb-2 mb-2">
                    <Text className="text-neutral-500">Growth Stage</Text>
                    <Text className="text-neutral-800">{plant.growthStage}</Text>
                  </View>
                  <View className="border-b border-neutral-100 pb-2 mb-2">
                    <Text className="text-neutral-500">Planted Date</Text>
                    <Text className="text-neutral-800">{plant.plantedDate}</Text>
                  </View>
                  {plant.notes && (
                    <View>
                      <Text className="text-neutral-500">Notes</Text>
                      <Text className="text-neutral-800">{plant.notes}</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'water' && (
                <View className="bg-white rounded-xl shadow p-4" style={theme.shadows.sm}>
                  <Text className="text-xl font-semibold mb-3">Watering Guide</Text>
                  <View className="flex-row items-center mb-4">
                    <View className="h-12 w-12 bg-blue-100 rounded-full justify-center items-center mr-3">
                      <Text className="text-lg font-bold text-blue-500">7</Text>
                    </View>
                    <View>
                      <Text className="font-medium">Water every 7 days</Text>
                      <Text className="text-neutral-500">In current season</Text>
                    </View>
                  </View>
                  <View className="mb-3">
                    <Text className="font-medium mb-1">Tips</Text>
                    <Text className="text-neutral-600">The top soil should be dry between waterings. Water thoroughly until water runs through the drainage holes.</Text>
                  </View>
                </View>
              )}

              {activeTab === 'light' && (
                <View className="bg-white rounded-xl shadow p-4" style={theme.shadows.sm}>
                  <Text className="text-xl font-semibold mb-3">Light Requirements</Text>
                  <View className="flex-row items-center mb-4">
                    <View className="h-12 w-12 bg-yellow-100 rounded-full justify-center items-center mr-3">
                      <Ionicons name="sunny" size={24} color={theme.colors.status.warning} />
                    </View>
                    <View>
                      <Text className="font-medium">Full Sun</Text>
                      <Text className="text-neutral-500">Preferred light condition</Text>
                    </View>
                  </View>
                  <View className="mb-3">
                    <Text className="font-medium mb-1">Details</Text>
                    <Text className="text-neutral-600">Cannabis plants require a minimum of 6 hours of direct sunlight daily, but ideally 8-10 hours for optimal growth.</Text>
                  </View>
                </View>
              )}

              {activeTab === 'toxicity' && (
                <View className="bg-white rounded-xl shadow p-4" style={theme.shadows.sm}>
                  <Text className="text-xl font-semibold mb-3">Toxicity Information</Text>
                  <View className="p-3 bg-red-50 rounded-lg mb-4">
                    <Text className="text-red-800 font-medium">Legal Warning</Text>
                    <Text className="text-red-700 mt-1">Cannabis contains psychoactive compounds and may be regulated or restricted in your location. Always follow local laws and regulations.</Text>
                  </View>
                  <Text className="text-neutral-600">While cannabis is not considered toxic to humans when used responsibly, it should be kept away from pets and children. Some animals may experience adverse effects if they consume cannabis.</Text>
                </View>
              )}

              {activeTab === 'humidity' && (
                <View className="bg-white rounded-xl shadow p-4" style={theme.shadows.sm}>
                  <Text className="text-xl font-semibold mb-3">Humidity Needs</Text>
                  <View className="flex-row items-center mb-4">
                    <View className="h-12 w-12 bg-blue-50 rounded-full justify-center items-center mr-3">
                      <Ionicons name="water-outline" size={24} color={theme.colors.special.watering} />
                    </View>
                    <View>
                      <Text className="font-medium">40-70% Humidity</Text>
                      <Text className="text-neutral-500">Ideal range depends on growth stage</Text>
                    </View>
                  </View>
                  <Text className="text-neutral-600">Seedlings prefer 65-70% humidity, vegetative stage 40-70%, and flowering stage 40-50%. Reduce humidity during late flowering to prevent mold.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!isEditing && (
        <View className="absolute bottom-0 left-0 right-0 bg-white p-4 flex-row justify-around items-center border-t border-neutral-200" style={theme.shadows.lg}>
          <TouchableOpacity className="w-16 h-16 bg-blue-100 rounded-full justify-center items-center">
            <Ionicons name="water-outline" size={24} color={theme.colors.special.watering} />
            <Text className="text-xs mt-1 text-blue-600 font-medium">Water</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="w-16 h-16 bg-purple-100 rounded-full justify-center items-center">
            <Ionicons name="flash-outline" size={24} color={theme.colors.special.feeding} />
            <Text className="text-xs mt-1 text-purple-600 font-medium">Feed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="w-16 h-16 bg-indigo-100 rounded-full justify-center items-center">
            <Ionicons name="camera-outline" size={24} color={theme.colors.status.info} />
            <Text className="text-xs mt-1 text-indigo-600 font-medium">Track</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
