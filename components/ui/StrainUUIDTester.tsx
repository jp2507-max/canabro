import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import ThemedText from './ThemedText';
import ThemedView from './ThemedView';
import { Strain as DataStrain, getStrainById } from '../../lib/data/strains';
import { StrainAutocomplete } from '../StrainAutocomplete';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { Plant } from '../../lib/models/Plant';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { Strain } from '../../lib/types/weed-db';

/**
 * A component for testing strain UUID generation and selection
 */
export function StrainUUIDTester() {
  const { theme, isDarkMode } = useTheme();
  const { database } = useDatabase();
  const [selectedStrain, setSelectedStrain] = useState<Strain | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [plants, setPlants] = useState<any[]>([]);
  const [mockStrains, setMockStrains] = useState<DataStrain[]>([]);
  
  // Load current plants from the database
  useEffect(() => {
    const loadPlants = async () => {
      try {
        const plantsCollection = database.get<Plant>('plants');
        const plantRecords = await plantsCollection.query().fetch();
        
        // Map to a simpler structure for display
        const simplePlants = await Promise.all(plantRecords.map(async (plant) => {
          return {
            id: plant.id,
            name: plant.name,
            strain: plant.strain,
            strainId: plant.strainId,
            matchingStrain: plant.strainId ? await getStrainById(plant.strainId) : null
          };
        }));
        
        setPlants(simplePlants);
      } catch (error) {
        console.error('Error loading plants:', error);
      }
    };
    
    loadPlants();
  }, [database]);

  // Load mock strains for demonstration
  useEffect(() => {
    const loadStrains = async () => {
      try {
        // Sample strains for testing
        const strains: DataStrain[] = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'OG Kush',
            type: 'hybrid',
            thcContent: 20,
            effects: ['relaxed', 'happy', 'euphoric'],
            flavors: ['earthy', 'pine', 'woody'],
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Blue Dream',
            type: 'sativa',
            thcContent: 18,
            effects: ['happy', 'creative', 'uplifted'],
            flavors: ['berry', 'sweet', 'vanilla'],
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            name: 'Northern Lights',
            type: 'indica',
            thcContent: 16,
            effects: ['relaxed', 'sleepy', 'happy'],
            flavors: ['sweet', 'spicy', 'pine'],
          },
        ];
        
        setMockStrains(strains);
      } catch (error) {
        console.error('Error loading strains:', error);
      }
    };
    
    loadStrains();
  }, []);

  return (
    <ThemedView className="p-4 bg-white dark:bg-neutral-900 rounded-lg">
      <ThemedText className="text-2xl font-bold mb-4">Strain UUID Test</ThemedText>
        {/* Current Strain UUIDs */}
      <ThemedText className="font-semibold mb-2">Current Strain UUIDs:</ThemedText>
      <ScrollView className="max-h-24 mb-4 border border-gray-200 dark:border-gray-700 rounded p-2">
        {mockStrains.map((strain: DataStrain) => (
          <ThemedText key={strain.id} className="text-xs mb-1">
            <ThemedText className="font-medium">{strain.name}:</ThemedText> {strain.id}
          </ThemedText>
        ))}
      </ScrollView>
        {/* Strain Selector Test */}
      <ThemedText className="font-semibold mb-2">Test Strain Selection:</ThemedText>
      <View className="mb-4">        <StrainAutocomplete 
          value={searchValue}
          onInputChange={(text: string) => setSearchValue(text)}
          onSelect={(strain: Strain | null) => {
            if (strain) {
              console.log('[StrainUUIDTester] Selected strain:', strain);
              // Convert to compatible strain type if needed
              setSelectedStrain(strain);
            }
          }}
          placeholder="Select a strain to test"
        />
      </View>
      
      {/* Selected Strain Info */}
      {selectedStrain && (
        <ThemedView className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <ThemedText className="font-semibold">Selected Strain:</ThemedText>
          <ThemedText>Name: {selectedStrain.name}</ThemedText>
          <ThemedText>UUID: {selectedStrain.id}</ThemedText>
          <ThemedText>Type: {selectedStrain.type}</ThemedText>
        </ThemedView>
      )}
      
      {/* Recent Plants with their Strain IDs */}
      <ThemedText className="font-semibold mt-4 mb-2">Recent Plants (with Strain IDs):</ThemedText>
      <ScrollView className="max-h-48 border border-gray-200 dark:border-gray-700 rounded p-2">
        {plants.length > 0 ? (
          plants.map((plant) => (
            <ThemedView key={plant.id} className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <ThemedText className="font-medium">{plant.name}</ThemedText>
              <ThemedText className="text-xs">Strain Name: {plant.strain}</ThemedText>
              <ThemedText className="text-xs">Strain ID: {plant.strainId || 'null'}</ThemedText>
              <ThemedText className="text-xs">
                Matches current strain: {plant.matchingStrain ? '✅ Yes' : '❌ No'}
              </ThemedText>
            </ThemedView>
          ))
        ) : (
          <ThemedText className="text-center text-neutral-500">No plants found</ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}
