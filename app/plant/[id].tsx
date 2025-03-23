import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { Plant } from '../../lib/models/Plant';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import supabase from '../../lib/supabase';

export default function PlantDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { database } = useDatabase();
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

  useEffect(() => {
    fetchPlant();
  }, [id]);

  const fetchPlant = async () => {
    try {
      setIsLoading(true);
      if (!id) return;

      const plantsCollection = database.get<Plant>('plants');
      const plantRecord = await plantsCollection.find(id as string);
      
      setPlant(plantRecord);
      setEditedName(plantRecord.name);
      setEditedStrain(plantRecord.strain);
      setEditedGrowthStage(plantRecord.growthStage);
      setEditedNotes(plantRecord.notes || '');
    } catch (error) {
      console.error('Error fetching plant:', error);
      Alert.alert('Error', 'Failed to load plant details.');
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
              
              await database.write(async () => {
                await plant.markAsDeleted();
              });
              
              Alert.alert('Success', 'Plant deleted successfully');
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
      await database.write(async () => {
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl text-gray-600">Plant not found</Text>
          <TouchableOpacity 
            className="mt-4 bg-green-600 px-4 py-2 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        
        <View className="flex-row">
          {isEditing ? (
            <>
              <TouchableOpacity 
                className="mr-4" 
                onPress={() => {
                  setIsEditing(false);
                  setNewImage(null);
                  setEditedName(plant.name);
                  setEditedStrain(plant.strain);
                  setEditedGrowthStage(plant.growthStage);
                  setEditedNotes(plant.notes || '');
                }}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={isSaving || isUploadingImage}>
                <Ionicons name="checkmark" size={24} color={isSaving || isUploadingImage ? "#9ca3af" : "#16a34a"} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity className="mr-4" onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Plant Image */}
          {isEditing ? (
            <TouchableOpacity 
              className="h-60 bg-gray-200 rounded-xl mb-4 justify-center items-center overflow-hidden"
              onPress={pickImage}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="large" color="#16a34a" />
              ) : newImage ? (
                <Image source={{ uri: newImage }} className="w-full h-full" resizeMode="cover" />
              ) : plant.imageUrl ? (
                <Image source={{ uri: plant.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 mt-2">Tap to add a photo</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View className="h-60 bg-gray-200 rounded-xl mb-4 justify-center items-center overflow-hidden">
              {plant.imageUrl ? (
                <Image source={{ uri: plant.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <Ionicons name="leaf-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500">No Image</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Plant Details */}
          {isEditing ? (
            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 mb-1">Plant Name</Text>
                <TextInput
                  className="bg-gray-100 p-3 rounded-lg"
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Plant Name"
                />
              </View>
              
              <View>
                <Text className="text-gray-700 mb-1">Strain</Text>
                <TextInput
                  className="bg-gray-100 p-3 rounded-lg"
                  value={editedStrain}
                  onChangeText={setEditedStrain}
                  placeholder="Strain"
                />
              </View>
              
              <View>
                <Text className="text-gray-700 mb-1">Growth Stage</Text>
                <View className="flex-row flex-wrap">
                  {['Seedling', 'Vegetative', 'Flowering', 'Harvested'].map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      className={`mr-2 mb-2 px-3 py-2 rounded-lg ${
                        editedGrowthStage === stage ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                      onPress={() => setEditedGrowthStage(stage)}
                    >
                      <Text
                        className={`${
                          editedGrowthStage === stage ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View>
                <Text className="text-gray-700 mb-1">Notes</Text>
                <TextInput
                  className="bg-gray-100 p-3 rounded-lg"
                  value={editedNotes}
                  onChangeText={setEditedNotes}
                  placeholder="Notes"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          ) : (
            <>
              <Text className="text-2xl font-bold mb-1">{plant.name}</Text>
              
              <View className="bg-green-50 p-4 rounded-xl mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="font-semibold">Strain</Text>
                  <Text>{plant.strain}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="font-semibold">Planted Date</Text>
                  <Text>{plant.plantedDate}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-semibold">Growth Stage</Text>
                  <Text>{plant.growthStage}</Text>
                </View>
              </View>
              
              <View className="mb-4">
                <Text className="text-lg font-semibold mb-2">Notes</Text>
                <Text className="text-gray-600">{plant.notes || 'No notes added yet.'}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
