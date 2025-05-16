import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EditPlantForm from '../../../components/my-plants/EditPlantForm';
import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import { useDatabase } from '../../../lib/contexts/DatabaseProvider';
import { Plant } from '../../../lib/models/Plant'; // Correct case-sensitive import

export default function EditPlantScreen() {
  const router = useRouter();
  const { id: plantId } = useLocalSearchParams<{ id: string }>();
  const { database } = useDatabase();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plantId || !database) {
      setError('Plant ID or database is missing.');
      setIsLoading(false);
      return;
    }

    const fetchPlant = async () => {
      try {
        setIsLoading(true);
        const fetchedPlant = await database.get<Plant>('plants').find(plantId);
        if (fetchedPlant) {
          setPlant(fetchedPlant);
        } else {
          setError('Plant not found.');
        }
      } catch (err) {
        console.error('Error fetching plant for editing:', err);
        setError('Failed to load plant data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlant();
  }, [plantId, database]);

  const handleUpdateSuccess = () => {
    router.back(); // Or navigate to the plant detail screen: router.replace(`/plant/${plantId}`);
  };  if (isLoading) {
    return (
      <SafeAreaView className="flex-1">
        <ThemedView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <ThemedText className="mt-4">Loading plant data...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }  if (error) {
    return (
      <SafeAreaView className="flex-1">
        <ThemedView className="flex-1 items-center justify-center">
          <ThemedText className="font-semibold text-red-500 text-center">{error}</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView className="flex-1">
        <ThemedView className="flex-1 items-center justify-center">
          <ThemedText className="font-semibold">Plant data could not be loaded.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }  return (
    <SafeAreaView className="flex-1">
      <Stack.Screen options={{ title: 'Edit Plant' }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ThemedView className="p-4 rounded-lg">
          <EditPlantForm plant={plant} onUpdateSuccess={handleUpdateSuccess} />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

// No need for StyleSheet since we're using NativeWind
