import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EditPlantForm from '../../../../components/my-plants/EditPlantForm';
import ThemedText from '../../../../components/ui/ThemedText';
import ThemedView from '../../../../components/ui/ThemedView';
import { useDatabase } from '../../../../lib/contexts/DatabaseProvider';
import { Plant } from '../../../../lib/models/Plant';

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
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <ThemedView className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" className="text-primary-500" />
          <ThemedText className="mt-4 text-center">Loading plant data...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <ThemedView className="flex-1 items-center justify-center px-4">
          <ThemedText className="text-status-danger text-center font-semibold">{error}</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <ThemedView className="flex-1 items-center justify-center px-4">
          <ThemedText className="text-center font-semibold">
            Plant data could not be loaded.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <Stack.Screen options={{ title: 'Edit Plant' }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-safe-or-4"
        showsVerticalScrollIndicator={false}>
        <ThemedView variant="card" className="rounded-lg">
          <EditPlantForm plant={plant} onUpdateSuccess={handleUpdateSuccess} />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
