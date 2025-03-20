import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import supabase from '../lib/supabase';
import { Plant } from '../lib/models/Plant';

export const AddPlantForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { database } = useDatabase();
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [growthStage, setGrowthStage] = useState('Seedling');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Create a new plant in the local database
      await database.write(async (writer) => {
        // Get the plants collection from database
        const plantsCollection = database.get('plants');
        await plantsCollection.create((plant: any) => {
          plant.name = name;
          plant.strain = strain;
          plant.plantedDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
          plant.growthStage = growthStage;
          plant.notes = notes;
          plant.userId = user.id;
        });
      });

      // Reset form
      setName('');
      setStrain('');
      setGrowthStage('Seedling');
      setNotes('');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      Alert.alert('Success', 'Your plant has been added successfully!');
    } catch (error) {
      console.error('Error adding plant:', error);
      Alert.alert('Error', 'Failed to add plant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">Add New Plant</Text>
      
      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-gray-700 mb-1">Plant Name</Text>
          <TextInput
            className="bg-gray-100 p-3 rounded-lg"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Northern Lights #4"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 mb-1">Strain</Text>
          <TextInput
            className="bg-gray-100 p-3 rounded-lg"
            value={strain}
            onChangeText={setStrain}
            placeholder="e.g., Indica, Sativa, or Hybrid"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 mb-1">Growth Stage</Text>
          <View className="flex-row flex-wrap">
            {['Seedling', 'Vegetative', 'Flowering', 'Harvested'].map((stage) => (
              <TouchableOpacity
                key={stage}
                className={`mr-2 mb-2 px-3 py-2 rounded-lg ${
                  growthStage === stage ? 'bg-green-600' : 'bg-gray-200'
                }`}
                onPress={() => setGrowthStage(stage)}
              >
                <Text
                  className={`${
                    growthStage === stage ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {stage}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View>
          <Text className="text-gray-700 mb-1">Notes (Optional)</Text>
          <TextInput
            className="bg-gray-100 p-3 rounded-lg"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional information about your plant"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
      
      <TouchableOpacity
        className={`p-3 rounded-lg ${isSubmitting ? 'bg-gray-400' : 'bg-green-600'}`}
        onPress={handleAddPlant}
        disabled={isSubmitting}
      >
        <Text className="text-white text-center font-semibold">
          {isSubmitting ? 'Adding Plant...' : 'Add Plant'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
