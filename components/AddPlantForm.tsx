"use client";

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useDatabase } from '../lib/hooks/useDatabase'; // Enhanced database hook with observables
import supabase from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { router } from 'expo-router';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GrowthStage, CreatePlantData } from '../lib/types/plant';
import { StrainAutocomplete } from './StrainAutocomplete';
import { Strain, searchStrainsByName } from '../lib/data/strains';
import { scheduleInitialPlantNotifications } from '../lib/services/NotificationService';
import useWatermelon from '../lib/hooks/useWatermelon'; // Import useWatermelon

// Enums for the form
enum GrowLocation {
  // Indoor locations
  GrowTent = 'Grow Tent',
  GrowRoom = 'Grow Room',
  Indoor = 'Indoor',
  
  // Outdoor locations
  Outdoor = 'Outdoor',
  Greenhouse = 'Greenhouse',
  Garden = 'Garden',
  Balcony = 'Balcony',
}

enum LightCondition {
  FullSun = 'Full Sun',
  PartialSun = 'Partial Sun',
  Shade = 'Shade',
  Artificial = 'Artificial Light',
}

enum GrowMedium {
  Soil = 'Soil',
  Coco = 'Coco Coir',
  Hydro = 'Hydroponic',
  Aqua = 'Aquaponic',
  SemiHydro = 'Semi-Hydro',
}

enum CannabisType {
  Indica = 'Indica',
  Sativa = 'Sativa',
  Hybrid = 'Hybrid',
  Ruderalis = 'Ruderalis',
  Unknown = 'Unknown',
}

// Step interface
interface FormStep {
  id: string;
  title: string;
  description?: string;
}

// Steps for the wizard
const FORM_STEPS: FormStep[] = [
  { id: 'photo', title: 'Add Photo', description: 'Add a photo of your plant' },
  { id: 'basicInfo', title: 'Basic Info', description: 'Name and strain information' },
  { id: 'location', title: 'Location', description: 'Where is your plant located?' },
  { id: 'lighting', title: 'Lighting', description: 'Light conditions for your plant' },
  { id: 'details', title: 'Growing Details', description: 'Growing medium and additional details' },
  { id: 'dates', title: 'Important Dates', description: 'Germination date and other key dates' },
];

export const AddPlantForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { database } = useDatabase();
  const { sync } = useWatermelon(); // Use the hook to get the sync function
  
  // Basic info
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [selectedStrain, setSelectedStrain] = useState<Strain | null>(null);
  const [cannabisType, setCannabisType] = useState<CannabisType>(CannabisType.Unknown);
  const [growthStage, setGrowthStage] = useState<GrowthStage>(GrowthStage.SEEDLING);
  
  // Location and environment
  const [location, setLocation] = useState<GrowLocation>(GrowLocation.Indoor);
  const [customLocation, setCustomLocation] = useState('');
  const [lightCondition, setLightCondition] = useState<LightCondition>(LightCondition.Artificial);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempCustomLocation, setTempCustomLocation] = useState('');
  
  // Growing details
  const [growMedium, setGrowMedium] = useState<GrowMedium>(GrowMedium.Soil);
  const [notes, setNotes] = useState('');

  // Important dates
  const [germinationDate, setGerminationDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // First step, cancel form
      router.back();
    }
  };

  // Camera and image handling
  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your photo library to upload images.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your camera to take photos.');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!image) return null;
    
    try {
      setUploadingImage(true);
      
      // Read the file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Generate a unique filename
      const filename = `plant_${Date.now()}.jpg`;
      const filePath = `${userId}/${filename}`;
      
      console.log('Uploading image to Supabase storage...');
      
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
      
      console.log('Image uploaded successfully');
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('plants')
        .getPublicUrl(filePath);
      
      console.log('Image public URL:', publicUrl);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle date change for date picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setGerminationDate(selectedDate);
    }
  };

  // Form validation
  const canProceedToNextStep = (): boolean => {
    switch (FORM_STEPS[currentStep].id) {
      case 'photo':
        // Photo is optional
        return true;
      case 'basicInfo':
        // Name and strain are required
        return !!name && !!strain;
      case 'location':
        // If custom location, it should be provided
        return location !== GrowLocation.Indoor || !!customLocation;
      default:
        return true;
    }
  };

  // Form submission
  const handleAddPlant = async () => {
    if (!name || !strain) {
      Alert.alert('Missing Information', 'Please provide a name and strain for your plant.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in to add a plant.');
        return;
      }

      // Upload image if selected
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(user.id);
      }

      // Log selected strain information for debugging
      console.log('Creating plant with strain:', strain);
      console.log('Selected strain object:', selectedStrain ? JSON.stringify(selectedStrain) : 'None');

      // Create plant data object
      const plantData: CreatePlantData = {
        name,
        strain,
        planted_date: germinationDate.toISOString().split('T')[0], // Germination date in YYYY-MM-DD format
        growth_stage: growthStage,
        notes: notes || undefined,
        image_url: imageUrl || undefined,
        is_auto_flower: cannabisType === CannabisType.Ruderalis || undefined,
        is_public: false, // Default to private
        strain_id: selectedStrain?.id
      };

      console.log('Plant data being created:', JSON.stringify(plantData));

      // Create a new plant in the local database
      let newPlantId: string = '';
      await database.write(async (writer) => {
        // Get the plants collection from database
        const plantsCollection = database.get('plants');
        const newPlant = await plantsCollection.create((plant: any) => {
          plant.name = plantData.name;
          plant.strain = plantData.strain;
          plant.plantedDate = plantData.planted_date;
          plant.growthStage = plantData.growth_stage;
          plant.notes = plantData.notes;
          plant.userId = user.id;
          
          // Add strain ID if a strain was selected from the autocomplete
          if (selectedStrain) {
            plant.strainId = selectedStrain.id;
            console.log('Setting strain ID in database:', selectedStrain.id);
          }
          
          // Additional custom fields
          plant.cannabisType = cannabisType;
          plant.location = location;
          plant.customLocation = customLocation;
          plant.lightCondition = lightCondition;
          plant.growMedium = growMedium;
          
          if (imageUrl) {
            plant.imageUrl = imageUrl;
          }
        });
        
        newPlantId = newPlant.id;
        console.log('Plant created successfully with ID:', newPlantId);
      });

      // Schedule notifications for the new plant
      if (newPlantId) {
        try {
          await scheduleInitialPlantNotifications(
            newPlantId,
            name,
            growthStage,
            germinationDate
          );
          console.log('Plant notifications scheduled successfully');
        } catch (error) {
          console.error('Error scheduling plant notifications:', error);
          // Continue with form submission even if notifications fail
        }
      }

      // Call sync function from useWatermelon
      console.log('(NOBRIDGE) LOG  Plant created locally, triggering sync...');
      try {
        await sync(); // Call the sync function from useWatermelon
        console.log('(NOBRIDGE) LOG  Sync triggered successfully after plant creation.');
      } catch (syncError) {
        console.error('(NOBRIDGE) ERROR  Failed to trigger sync after plant creation:', syncError);
        // Decide how to handle sync errors - maybe alert the user?
      }

      // Reset form
      setName('');
      setStrain('');
      setSelectedStrain(null);
      setGrowthStage(GrowthStage.SEEDLING);
      setCannabisType(CannabisType.Unknown);
      setLocation(GrowLocation.Indoor);
      setCustomLocation('');
      setLightCondition(LightCondition.Artificial);
      setGrowMedium(GrowMedium.Soil);
      setNotes('');
      setImage(null);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      Alert.alert('Success', 'Your plant has been added successfully!');
      router.back();
    } catch (error) {
      console.error('Error adding plant:', error);
      Alert.alert('Error', 'Failed to add plant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step
  const renderStepContent = () => {
    const currentStepId = FORM_STEPS[currentStep].id;
    
    switch (currentStepId) {
      case 'photo':
        return renderPhotoStep();
      case 'basicInfo':
        return renderBasicInfoStep();
      case 'location':
        return renderLocationStep();
      case 'lighting':
        return renderLightingStep();
      case 'details':
        return renderDetailsStep();
      case 'dates':
        return renderDatesStep();
      default:
        return null;
    }
  };

  // Step content renderers
  const renderPhotoStep = () => (
    <View className="space-y-6 mt-4">
      <View className="items-center">
        <TouchableOpacity 
          className="h-64 w-64 bg-gray-100 rounded-xl mb-4 justify-center items-center overflow-hidden"
          onPress={pickImage}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="large" color="#16a34a" />
          ) : image ? (
            <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="image-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 mt-2">Add a photo of your plant</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View className="flex-row justify-center mt-4 space-x-4">
        <TouchableOpacity 
          className="bg-gray-200 rounded-full p-4"
          onPress={takePhoto}
          disabled={uploadingImage}
        >
          <Ionicons name="camera" size={32} color="#374151" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-gray-200 rounded-full p-4"
          onPress={pickImage}
          disabled={uploadingImage}
        >
          <Ionicons name="images" size={32} color="#374151" />
        </TouchableOpacity>
      </View>
      
      <Text className="text-center text-gray-500 mt-2">
        Adding a photo helps track your plant's growth over time
      </Text>
    </View>
  );

  const renderBasicInfoStep = () => (
    <View className="space-y-6 mt-4">
      <View className="mb-4">
        <Text className="text-gray-700 mb-2 font-medium">Plant Name</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
          placeholder="Enter a name for your plant"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 mb-2 font-medium">Strain</Text>
        <StrainAutocomplete
          value={strain}
          onInputChange={setStrain}
          onSelect={(selectedStrain) => {
            console.log('Strain selected:', selectedStrain.name, 'ID:', selectedStrain.id);
            setStrain(selectedStrain.name);
            setSelectedStrain(selectedStrain);
            
            // Auto-select cannabis type based on strain if it's currently unknown
            if (cannabisType === CannabisType.Unknown) {
              switch (selectedStrain.type) {
                case 'indica':
                  setCannabisType(CannabisType.Indica);
                  break;
                case 'sativa':
                  setCannabisType(CannabisType.Sativa);
                  break;
                case 'hybrid':
                  setCannabisType(CannabisType.Hybrid);
                  break;
              }
            }
          }}
          placeholder="Search for a cannabis strain..."
          className="mb-2"
        />
        {selectedStrain && (
          <View className="bg-gray-100 p-3 rounded-lg">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="font-bold">{selectedStrain.name}</Text>
              <View className="bg-green-100 px-2 py-1 rounded">
                <Text className="text-green-800 text-xs capitalize">{selectedStrain.type}</Text>
              </View>
            </View>
            {selectedStrain.thcContent && selectedStrain.cbdContent && (
              <View className="flex-row mb-1">
                <Text className="text-xs text-gray-600 mr-3">THC: {selectedStrain.thcContent}%</Text>
                <Text className="text-xs text-gray-600">CBD: {selectedStrain.cbdContent}%</Text>
              </View>
            )}
            {selectedStrain.description && (
              <Text className="text-xs text-gray-600 mt-1" numberOfLines={2}>
                {selectedStrain.description}
              </Text>
            )}
            {selectedStrain.effects && selectedStrain.effects.length > 0 && (
              <View className="flex-row flex-wrap mt-2">
                {selectedStrain.effects.slice(0, 3).map((effect, index) => (
                  <View key={index} className="bg-blue-100 rounded px-2 py-1 mr-1 mb-1">
                    <Text className="text-blue-800 text-xs">{effect}</Text>
                  </View>
                ))}
                {selectedStrain.effects.length > 3 && (
                  <Text className="text-xs text-gray-500 self-center ml-1">+{selectedStrain.effects.length - 3} more</Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      <View>
        <Text className="text-gray-700 mb-3 font-medium">Cannabis Type</Text>
        <View className="flex-row flex-wrap">
          {Object.values(CannabisType).map((type) => (
            <TouchableOpacity
              key={type}
              className={`mr-2 mb-2 px-4 py-3 rounded-lg ${
                cannabisType === type ? 'bg-green-600' : 'bg-gray-200'
              }`}
              onPress={() => setCannabisType(type)}
            >
              <Text
                className={`${
                  cannabisType === type ? 'text-white' : 'text-gray-800'
                } font-medium`}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View>
        <Text className="text-gray-700 mb-3 font-medium">Growth Stage</Text>
        <View className="flex-row flex-wrap">
          {[GrowthStage.GERMINATION, GrowthStage.SEEDLING, GrowthStage.VEGETATIVE, GrowthStage.PRE_FLOWER, GrowthStage.FLOWERING, GrowthStage.LATE_FLOWERING, GrowthStage.HARVEST, GrowthStage.CURING].map((stage) => (
            <TouchableOpacity
              key={stage}
              className={`mr-2 mb-2 px-4 py-3 rounded-lg ${
                growthStage === stage ? 'bg-green-600' : 'bg-gray-200'
              }`}
              onPress={() => setGrowthStage(stage)}
            >
              <Text
                className={`${
                  growthStage === stage ? 'text-white' : 'text-gray-800'
                } font-medium`}
              >
                {stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View className="space-y-6 mt-4">
      <Text className="text-lg font-semibold text-gray-800">Where is your plant located?</Text>
      
      <View className="space-y-4">
        <Text className="text-gray-700 font-medium">Indoor Locations</Text>
        <View className="flex-row flex-wrap justify-start">
          {[GrowLocation.GrowTent, GrowLocation.GrowRoom, GrowLocation.Indoor].map((loc) => (
            <TouchableOpacity
              key={loc}
              className={`m-1 p-1 items-center rounded-xl w-24 h-24 justify-center ${
                location === loc ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'
              }`}
              onPress={() => setLocation(loc)}
            >
              <View className={`rounded-full p-3 ${location === loc ? 'bg-green-600' : 'bg-gray-200'}`}>
                <Ionicons 
                  name={loc === GrowLocation.GrowTent ? "home-outline" : 
                        loc === GrowLocation.GrowRoom ? "bed-outline" : "cube-outline"} 
                  size={28} 
                  color={location === loc ? "white" : "#374151"} 
                />
              </View>
              <Text className="text-center mt-2 text-sm">{loc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text className="text-gray-700 font-medium mt-4">Outdoor Locations</Text>
        <View className="flex-row flex-wrap justify-start">
          {[GrowLocation.Outdoor, GrowLocation.Greenhouse, GrowLocation.Garden, GrowLocation.Balcony].map((loc) => (
            <TouchableOpacity
              key={loc}
              className={`m-1 p-1 items-center rounded-xl w-24 h-24 justify-center ${
                location === loc ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'
              }`}
              onPress={() => setLocation(loc)}
            >
              <View className={`rounded-full p-3 ${location === loc ? 'bg-green-600' : 'bg-gray-200'}`}>
                <Ionicons 
                  name={loc === GrowLocation.Outdoor ? "leaf-outline" : 
                        loc === GrowLocation.Greenhouse ? "home-outline" : 
                        loc === GrowLocation.Garden ? "flower-outline" : "sunny-outline"} 
                  size={28} 
                  color={location === loc ? "white" : "#374151"} 
                />
              </View>
              <Text className="text-center mt-2 text-sm">{loc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          className="mt-4 p-4 rounded-xl border border-dashed border-gray-400 flex-row items-center justify-center"
          onPress={() => {
            setTempCustomLocation(customLocation);
            setShowLocationModal(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={24} color="#4b5563" />
          <Text className="ml-2 text-gray-600">Add Custom Location</Text>
        </TouchableOpacity>
        
        {customLocation ? (
          <View className="mt-2 p-3 bg-green-100 rounded-lg">
            <Text className="text-green-800">Custom location: {customLocation}</Text>
          </View>
        ) : null}

        {/* Custom Location Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showLocationModal}
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-white rounded-xl p-6 w-5/6 max-w-md">
              <Text className="text-lg font-semibold text-gray-800 mb-4">Custom Location</Text>
              
              <TextInput
                className="bg-gray-100 p-4 rounded-xl mb-4"
                value={tempCustomLocation}
                onChangeText={setTempCustomLocation}
                placeholder="Enter custom location name"
              />
              
              <View className="flex-row justify-end space-x-3">
                <TouchableOpacity 
                  className="px-4 py-2 rounded-lg bg-gray-200"
                  onPress={() => setShowLocationModal(false)}
                >
                  <Text className="text-gray-800">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="px-4 py-2 rounded-lg bg-green-600"
                  onPress={() => {
                    if (tempCustomLocation.trim()) {
                      setCustomLocation(tempCustomLocation.trim());
                    }
                    setShowLocationModal(false);
                  }}
                >
                  <Text className="text-white">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );

  const renderLightingStep = () => (
    <View className="space-y-6 mt-4">
      <Text className="text-lg font-semibold text-gray-800">How much light does this location get?</Text>
      
      <TouchableOpacity 
        className="bg-green-100 p-4 rounded-xl mb-4 flex-row items-center"
      >
        <Ionicons name="sunny" size={24} color="#16a34a" />
        <Text className="ml-2 text-green-800 font-medium">Use light meter</Text>
      </TouchableOpacity>
      
      <View className="space-y-4">
        {Object.values(LightCondition).map((light) => (
          <TouchableOpacity
            key={light}
            className={`p-4 rounded-xl flex-row items-center ${
              lightCondition === light ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'
            }`}
            onPress={() => setLightCondition(light)}
          >
            <View className={`rounded-full p-2 ${lightCondition === light ? 'bg-green-600' : 'bg-gray-300'}`}>
              <Ionicons 
                name={light === LightCondition.FullSun ? "sunny" : 
                      light === LightCondition.PartialSun ? "partly-sunny" : 
                      light === LightCondition.Shade ? "cloud" : "bulb"} 
                size={24} 
                color={lightCondition === light ? "white" : "#374151"} 
              />
            </View>
            <View className="ml-3">
              <Text className="font-medium text-gray-800">{light}</Text>
              <Text className="text-gray-500 text-sm">
                {light === LightCondition.FullSun 
                  ? 'At least 8 hours of direct sunlight' 
                  : light === LightCondition.PartialSun 
                  ? 'Bright light with some direct sun' 
                  : light === LightCondition.Shade 
                  ? 'Little to no direct sunlight' 
                  : 'Grow lights on a schedule'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View className="space-y-6 mt-4">
      <View>
        <Text className="text-gray-700 mb-3 font-medium">Growing Medium</Text>
        <View className="flex-row flex-wrap">
          {Object.values(GrowMedium).map((medium) => (
            <TouchableOpacity
              key={medium}
              className={`mr-2 mb-2 px-4 py-3 rounded-lg ${
                growMedium === medium ? 'bg-green-600' : 'bg-gray-200'
              }`}
              onPress={() => setGrowMedium(medium)}
            >
              <Text
                className={`${
                  growMedium === medium ? 'text-white' : 'text-gray-800'
                } font-medium`}
              >
                {medium}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View>
        <Text className="text-gray-700 mb-1 font-medium">Notes (Optional)</Text>
        <TextInput
          className="bg-gray-100 p-4 rounded-xl"
          value={notes}
          onChangeText={setNotes}
          placeholder="Nutrients, watering schedule, or other details"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderDatesStep = () => (
    <View className="space-y-6 mt-4">
      <View>
        <Text className="text-gray-700 mb-1 font-medium">Germination Date</Text>
        <TouchableOpacity 
          className="bg-gray-100 p-4 rounded-xl flex-row justify-between items-center"
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{format(germinationDate, 'MMMM d, yyyy')}</Text>
          <Ionicons name="calendar-outline" size={24} color="#4b5563" />
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={germinationDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>
      
      <View className="p-4 bg-gray-100 rounded-xl">
        <Text className="text-gray-700 font-medium mb-2">Important Cannabis Growing Dates</Text>
        <Text className="text-gray-600">
          • Seedling: 2-3 weeks{'\n'}
          • Vegetative: 3-16 weeks{'\n'}
          • Flowering: 8-11 weeks{'\n'}
          • Total grow time: 3-6 months
        </Text>
      </View>
    </View>
  );

  // Helper for progress indicator
  const renderProgressIndicator = () => (
    <View className="w-full flex-row justify-between mt-2 mb-8 px-1">
      {FORM_STEPS.map((step, index) => (
        <View 
          key={step.id} 
          className={`h-1 flex-1 mx-0.5 rounded-full ${
            index < currentStep 
              ? 'bg-green-600' 
              : index === currentStep 
              ? 'bg-green-400' 
              : 'bg-gray-200'
          }`} 
        />
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="px-4 pt-4 pb-20 min-h-screen">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-2">
            <TouchableOpacity 
              onPress={goToPreviousStep}
              className="p-2"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-xl font-bold">{FORM_STEPS[currentStep].title}</Text>
            
            <View className="w-10" />
          </View>
          
          {/* Description */}
          {FORM_STEPS[currentStep].description && (
            <Text className="text-gray-500 text-center mb-4">
              {FORM_STEPS[currentStep].description}
            </Text>
          )}
          
          {/* Progress indicator */}
          {renderProgressIndicator()}
          
          {/* Step content */}
          {renderStepContent()}
          
          {/* Navigation buttons */}
          <View className="mt-8 space-y-3">
            {currentStep === FORM_STEPS.length - 1 ? (
              <TouchableOpacity
                className={`p-4 rounded-xl ${isSubmitting || !canProceedToNextStep() ? 'bg-gray-400' : 'bg-green-600'}`}
                onPress={handleAddPlant}
                disabled={isSubmitting || !canProceedToNextStep()}
              >
                <Text className="text-white text-center font-semibold">
                  {isSubmitting ? 'Adding Plant...' : 'Add Plant'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className={`p-4 rounded-xl ${!canProceedToNextStep() ? 'bg-gray-400' : 'bg-green-600'}`}
                onPress={goToNextStep}
                disabled={!canProceedToNextStep()}
              >
                <Text className="text-white text-center font-semibold">
                  Continue
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
