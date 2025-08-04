import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../../lib/contexts/AuthProvider';
import { useDatabase } from '../../../../lib/contexts/DatabaseProvider';
import { generateUuid } from '../../../../lib/utils/uuid';
import EnhancedKeyboardWrapper from '../../../../components/keyboard/EnhancedKeyboardWrapper';

interface Plant {
  id: string;
  name: string;
  strain?: string;
}

interface PlantTaskFormData {
  plantId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'watering' | 'feeding' | 'pruning' | 'inspection' | 'other';
}

export default function AddPlantTaskScreen() {
  const { t } = useTranslation('plantTasks');
  const router = useSafeRouter();
  const { selectedDate } = useLocalSearchParams<{ selectedDate?: string }>();
  const { session } = useAuth();
  const { database } = useDatabase();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [formData, setFormData] = useState<PlantTaskFormData>({
    plantId: '',
    title: '',
    description: '',
    dueDate: selectedDate ? new Date(selectedDate) : new Date(),
    priority: 'medium',
    category: 'watering',
  });

  useEffect(() => {
    fetchUserPlants();
  }, []);

  const fetchUserPlants = async () => {
    try {
      if (!session?.user?.id || !database) {
        setPlants([]);
        return;
      }

      // Fetch plants from local database
      const plantsCollection = database.get('plants');
      const userPlants = await plantsCollection.query().fetch();

      type PlantModelLike = {
        id: string;
        name: string;
        strain?: string | null;
      };

      const plantData = userPlants.map((plant: unknown) => {
        const p = plant as PlantModelLike;
        return {
          id: p.id,
          name: p.name,
          strain: p.strain ?? undefined,
        };
      });

      setPlants(plantData);
    } catch (error) {
      console.error('Error fetching plants:', error);
      Alert.alert(t('error'), t('failedToLoadPlants'));
      // Fallback to mock data for development
      setPlants([
        { id: '1', name: 'Northern Lights #1', strain: 'Northern Lights' },
        { id: '2', name: 'White Widow Clone', strain: 'White Widow' },
        { id: '3', name: 'OG Kush Seedling', strain: 'OG Kush' },
      ]);
    } finally {
      setLoadingPlants(false);
    }
  };

  const handleSave = async () => {
    if (!formData.plantId || !formData.title.trim()) {
      Alert.alert(t('validationError'), t('selectPlantAndTitle'));
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(t('authenticationError'), t('pleaseLogInToCreateTasks'));
      return;
    }

    if (!database) {
      Alert.alert(t('databaseError'), t('databaseNotAvailable'));
      return;
    }

    setSavingTask(true);

    try {
      const taskId = generateUuid();
      const now = new Date();

      // Create plant task in local database
      await database.write(async () => {
        const plantTasksCollection = database.get('plant_tasks');
        await plantTasksCollection.create((task) => {
          // WatermelonDB Model is structurally typed; avoid narrowing the callback param
          // and assign known fields that exist on PlantTask model.
          task._raw.id = taskId;
          // @ts-expect-error known model fields at runtime
          task.taskId = taskId;
          // @ts-expect-error known model fields at runtime
          task.plantId = formData.plantId;
          // @ts-expect-error known model fields at runtime
          task.title = formData.title.trim();
          // @ts-expect-error known model fields at runtime
          task.description = formData.description.trim() || undefined;
          // @ts-expect-error known model fields at runtime
          task.taskType = formData.category;
          // @ts-expect-error known model fields at runtime
          task.dueDate = formData.dueDate.toISOString();
          // @ts-expect-error known model fields at runtime
          task.status = 'pending';
          // @ts-expect-error known model fields at runtime
          task.userId = session.user.id;
          // @ts-expect-error known model fields at runtime
          task.createdAt = now;
          // @ts-expect-error known model fields at runtime
          task.updatedAt = now;
        });
      });

      // TODO: Also save to Supabase for synchronization
      // This can be implemented later for cloud sync

      Alert.alert(t('success'), t('plantTaskCreatedSuccessfully'), [
        {
          text: t('ok'),
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating plant task:', error);
      Alert.alert(t('error'), t('failedToCreateTask'));
    } finally {
      setSavingTask(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loadingPlants) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-gray-500 dark:text-gray-400">{t('loadingPlants')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <EnhancedKeyboardWrapper className="flex-1" showToolbar={false}>
        <ScrollView className="flex-1 px-4 py-6">
          <View className="space-y-6">
            {/* Plant Selection */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('selectPlant')}
              </Text>
              {plants.length === 0 ? (
                <View className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                  <Text className="text-center text-gray-600 dark:text-gray-400">
                    {t('noPlantsFound')}
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {plants.map((plant) => (
                    <TouchableOpacity
                      key={plant.id}
                      className={`rounded-lg border p-4 ${
                        formData.plantId === plant.id
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                      }`}
                      onPress={() => setFormData((prev) => ({ ...prev, plantId: plant.id }))}>
                      <Text
                        className={`font-medium ${
                          formData.plantId === plant.id
                            ? 'text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                        {plant.name}
                      </Text>
                      {plant.strain && (
                        <Text
                          className={`text-sm ${
                            formData.plantId === plant.id
                              ? 'text-green-100'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                          {plant.strain}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Task Title */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('taskTitle')}
              </Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={t('enterTaskTitle')}
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={(title) => setFormData((prev) => ({ ...prev, title }))}
              />
            </View>

            {/* Description */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('descriptionOptional')}
              </Text>
              <TextInput
                className="h-24 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={t('addTaskDetails')}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(description) => setFormData((prev) => ({ ...prev, description }))}
              />
            </View>

            {/* Priority Selection */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('priority')}
              </Text>
              <View className="flex-row space-x-3">
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    className={`flex-1 rounded-lg border py-3 ${
                      formData.priority === priority
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                    }`}
                    onPress={() => setFormData((prev) => ({ ...prev, priority }))}>
                    <Text
                      className={`text-center font-medium capitalize ${
                        formData.priority === priority
                          ? 'text-white'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                      {t(`priority.${priority}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selection */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('category')}
              </Text>
              <View className="space-y-2">
                {(['watering', 'feeding', 'pruning', 'inspection', 'other'] as const).map(
                  (category) => (
                    <TouchableOpacity
                      key={category}
                      className={`rounded-lg border px-4 py-3 ${
                        formData.category === category
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                      }`}
                      onPress={() => setFormData((prev) => ({ ...prev, category }))}>
                      <Text
                        className={`font-medium capitalize ${
                          formData.category === category
                            ? 'text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                        {t(`category.${category}`)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="border-t border-gray-200 px-4 py-6 dark:border-gray-700">
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 rounded-lg bg-gray-200 py-4 dark:bg-gray-700"
              onPress={handleCancel}>
              <Text className="text-center font-semibold text-gray-900 dark:text-white">{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg py-4 ${
                formData.plantId && formData.title.trim() && !savingTask
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              onPress={handleSave}
              disabled={!formData.plantId || !formData.title.trim() || savingTask}>
              <Text className="text-center font-semibold text-white">
                {savingTask ? t('saving') : t('saveTask')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </EnhancedKeyboardWrapper>
    </SafeAreaView>
  );
}
