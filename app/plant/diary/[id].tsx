import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../../lib/contexts/AuthProvider';
import { useTheme } from '../../../lib/contexts/ThemeContext';
import ThemedView from '../../../components/ui/ThemedView';
import ThemedText from '../../../components/ui/ThemedText';
import { isExpoGo } from '../../../lib/config';
import useWatermelon from '../../../lib/hooks/useWatermelon';
import { Q } from '@nozbe/watermelondb';
import { DiaryEntry } from '../../../lib/models/DiaryEntry';
import { Plant } from '../../../lib/models/Plant';

// Simplified interfaces for component state
interface DiaryEntryData {
  id: string;
  entryId: string;
  plantId: string;
  title?: string;
  content: string;
  entryType: string;
  entryDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function PlantDiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { plants, diaryEntries, sync, isSyncing } = useWatermelon();
  
  const [plant, setPlant] = useState<Plant | null>(null);
  const [entries, setEntries] = useState<DiaryEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New entry form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryType, setEntryType] = useState<string>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const contentInputRef = useRef<TextInput>(null);

  // Fetch plant information
  const fetchPlant = async () => {
    try {
      if (!id) {
        setError('No plant ID provided');
        setLoading(false);
        return;
      }

      // First try to find plant by id
      try {
        const plantRecord = await plants.find(id);
        setPlant(plantRecord);
      } catch (error) {
        // If direct find failed, try querying by plant_id
        console.log('Finding plant by plant_id instead');
        const plantRecords = await plants.query(Q.where('plant_id', id)).fetch();
        
        if (plantRecords.length > 0) {
          setPlant(plantRecords[0]);
        } else {
          setError('Plant not found');
        }
      }
    } catch (error) {
      console.error('Error fetching plant:', error);
      setError('Failed to load plant information');
    }
  };

  // Fetch diary entries
  const fetchEntries = async () => {
    try {
      if (!id) return;
      
      // Query diary entries for this plant
      let plantIdToUse = id;
      
      // If we have plant object and it has a plantId, use that
      if (plant && plant.plantId) {
        plantIdToUse = plant.plantId;
      }
      
      const entriesRecords = await diaryEntries.query(
        Q.where('plant_id', plantIdToUse)
      ).fetch();
      
      // Convert WatermelonDB records to simplified interface for component
      const entriesData: DiaryEntryData[] = entriesRecords.map(entry => ({
        id: entry.id,
        entryId: entry.entryId,
        plantId: entry.plantId,
        title: entry.content.substring(0, 30) + (entry.content.length > 30 ? '...' : ''),
        content: entry.content,
        entryType: entry.entryType || 'general',
        entryDate: entry.entryDate,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      }));
      
      // Sort entries by date (newest first)
      entriesData.sort((a, b) => 
        new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      );
      
      setEntries(entriesData);
    } catch (error) {
      console.error('Error fetching diary entries:', error);
      setError('Failed to load diary entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPlant();
      await fetchEntries();
    };
    
    loadData();
  }, [id]);

  // Refresh data (for pull-to-refresh)
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await sync();
      await fetchPlant();
      await fetchEntries();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Add new diary entry
  const handleAddEntry = async () => {
    if (!entryContent.trim()) {
      Alert.alert('Error', 'Entry content cannot be empty');
      return;
    }

    if (!plant) {
      Alert.alert('Error', 'Plant information not available');
      return;
    }

    setIsSubmitting(true);

    try {
      await diaryEntries.database.write(async () => {
        const now = new Date();
        const newEntry = await diaryEntries.create((entry) => {
          entry.plantId = plant.plantId || id as string;
          entry.content = entryContent;
          entry.entryType = entryType;
          entry.entryDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
          entry.userId = session?.user?.id || '';
        });
        
        console.log('Diary entry created:', newEntry.id);
      });

      // Clear form and refresh entries
      setEntryContent('');
      setEntryTitle('');
      setEntryType('general');
      setIsAddingEntry(false);
      
      // Trigger sync to update Supabase
      await sync();
      
      // Refresh entries list
      await fetchEntries();
      
    } catch (error) {
      console.error('Error adding diary entry:', error);
      Alert.alert('Error', 'Failed to save diary entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Entry type selection options
  const entryTypes = [
    { id: 'general', label: 'General', icon: 'document-text' },
    { id: 'watering', label: 'Watering', icon: 'water' },
    { id: 'feeding', label: 'Feeding', icon: 'nutrition' },
    { id: 'pruning', label: 'Pruning', icon: 'cut' },
    { id: 'transplant', label: 'Transplant', icon: 'arrow-up-circle' },
    { id: 'harvest', label: 'Harvest', icon: 'leaf' },
    { id: 'problem', label: 'Problem', icon: 'warning' },
  ];

  // Get icon for entry type
  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'watering':
        return 'water-outline';
      case 'feeding':
        return 'flask-outline';
      case 'pruning':
        return 'cut-outline';
      case 'transplant':
        return 'leaf-outline';
      case 'harvest':
        return 'basket-outline';
      case 'problem':
        return 'warning-outline';
      default:
        return 'journal-outline';
    }
  };

  // Get color for entry type
  const getEntryColor = (type: string) => {
    switch (type) {
      case 'watering':
        return theme.colors.special.watering;
      case 'feeding':
        return theme.colors.special.feeding;
      case 'pruning':
        return theme.colors.primary[500];
      case 'transplant':
        return theme.colors.status.warning;
      case 'harvest':
        return theme.colors.special.harvesting;
      case 'problem':
        return theme.colors.status.danger;
      default:
        return theme.colors.neutral[400];
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Render entry type selector
  const renderEntryTypeSelector = () => {
    return (
      <FlatList
        horizontal
        data={entryTypes}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = entryType === item.id;
          return (
            <Pressable
              className={`mr-2 py-1 px-3 rounded-full border ${isSelected ? 'border-primary-500' : 'border-neutral-300'}`}
              style={isSelected ? { backgroundColor: `${getEntryColor(item.id)}20` } : {}}
              onPress={() => setEntryType(item.id)}
            >
              <View className="flex-row items-center">
                <Ionicons 
                  name={getEntryIcon(item.id)} 
                  size={16} 
                  color={isSelected ? getEntryColor(item.id) : theme.colors.neutral[400]} 
                  style={{ marginRight: 4 }}
                />
                <ThemedText 
                  className={`text-sm ${isSelected ? 'font-medium' : ''}`}
                  lightClassName={isSelected ? 'text-neutral-800' : 'text-neutral-600'}
                  darkClassName={isSelected ? 'text-neutral-800' : 'text-neutral-600'}
                >
                  {item.label}
                </ThemedText>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    );
  };

  // Render a diary entry card
  const renderEntryCard = ({ item }: { item: DiaryEntryData }) => {
    return (
      <ThemedView 
        className="mb-4 rounded-2xl overflow-hidden"
        lightClassName="bg-white" 
        darkClassName="bg-neutral-800"
        style={{ ...theme.shadows.md }}
      >
        <View className="p-4">
          {/* Header with type icon and date */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View 
                className="w-8 h-8 rounded-full justify-center items-center mr-2"
                style={{ backgroundColor: `${getEntryColor(item.entryType)}20` }}
              >
                <Ionicons 
                  name={getEntryIcon(item.entryType)} 
                  size={16} 
                  color={getEntryColor(item.entryType)}
                />
              </View>
              <ThemedText 
                className="text-xs uppercase font-medium" 
                lightClassName="text-neutral-600" 
                darkClassName="text-neutral-400"
              >
                {item.entryType}
              </ThemedText>
            </View>
            
            <ThemedText 
              className="text-sm" 
              lightClassName="text-neutral-500" 
              darkClassName="text-neutral-500"
            >
              {formatDate(item.entryDate)}
            </ThemedText>
          </View>
          
          {/* Title */}
          <ThemedText 
            className="text-lg font-bold mb-2" 
            lightClassName="text-neutral-800" 
            darkClassName="text-neutral-100"
          >
            {item.title}
          </ThemedText>
          
          {/* Content */}
          <ThemedText 
            className="text-base" 
            lightClassName="text-neutral-700" 
            darkClassName="text-neutral-300"
          >
            {item.content}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  // Render new entry form
  const renderNewEntryForm = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="mb-4"
      >
        <ThemedView 
          className="p-4 rounded-2xl"
          lightClassName="bg-white" 
          darkClassName="bg-neutral-800"
          style={{ ...theme.shadows.md }}
        >
          <ThemedText 
            className="text-lg font-bold mb-3" 
            lightClassName="text-neutral-800" 
            darkClassName="text-neutral-100"
          >
            New Diary Entry
          </ThemedText>
          
          {/* Entry type selector */}
          {renderEntryTypeSelector()}
          
          {/* Title input */}
          <ThemedView 
            className="mb-3 rounded-lg p-3"
            lightClassName="bg-neutral-100" 
            darkClassName="bg-neutral-700"
          >
            <TextInput
              placeholder="Entry title"
              placeholderTextColor={theme.colors.neutral[400]}
              value={entryTitle}
              onChangeText={setEntryTitle}
              className="text-base"
              style={{ 
                color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800] 
              }}
              returnKeyType="next"
              onSubmitEditing={() => contentInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </ThemedView>
          
          {/* Content input */}
          <ThemedView 
            className="mb-4 rounded-lg p-3"
            lightClassName="bg-neutral-100" 
            darkClassName="bg-neutral-700"
          >
            <TextInput
              ref={contentInputRef}
              placeholder="What happened with your plant?"
              placeholderTextColor={theme.colors.neutral[400]}
              value={entryContent}
              onChangeText={setEntryContent}
              multiline
              numberOfLines={4}
              className="text-base"
              style={{ 
                color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800],
                textAlignVertical: 'top',
                minHeight: 80
              }}
            />
          </ThemedView>
          
          {/* Action buttons */}
          <View className="flex-row justify-end">
            <Pressable 
              onPress={() => setIsAddingEntry(false)}
              className="py-2 px-4 rounded-lg mr-2"
              disabled={isSubmitting}
            >
              <ThemedText 
                className="font-medium" 
                lightClassName="text-neutral-500" 
                darkClassName="text-neutral-400"
              >
                Cancel
              </ThemedText>
            </Pressable>
            
            <Pressable 
              onPress={handleAddEntry}
              className="py-2 px-4 rounded-lg"
              style={{ backgroundColor: theme.colors.primary[500] }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText className="font-medium text-white">
                  Save Entry
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack.Screen 
        options={{
          title: plant?.name || 'Plant Diary',
          headerBackTitle: 'Back',
        }}
      />
      
      <SafeAreaView className="flex-1 bg-primary-50">
        <ThemedView className="flex-1 p-4" lightClassName="bg-primary-50" darkClassName="bg-neutral-900">
          {/* Plant info header */}
          {plant && (
            <ThemedView 
              className="mb-4 p-4 rounded-2xl flex-row items-center"
              lightClassName="bg-white" 
              darkClassName="bg-neutral-800"
              style={{ ...theme.shadows.sm }}
            >
              <View 
                className="w-12 h-12 rounded-full mr-3 justify-center items-center"
                style={{ backgroundColor: theme.colors.primary[100] }}
              >
                <Ionicons name="leaf" size={24} color={theme.colors.primary[500]} />
              </View>
              
              <View>
                <ThemedText 
                  className="text-lg font-bold" 
                  lightClassName="text-neutral-800" 
                  darkClassName="text-neutral-100"
                >
                  {plant.name}
                </ThemedText>
                
                <ThemedText 
                  className="text-sm" 
                  lightClassName="text-neutral-600" 
                  darkClassName="text-neutral-400"
                >
                  {plant.strain} • {plant.growthStage || 'Unknown stage'}
                </ThemedText>
              </View>
            </ThemedView>
          )}
          
          {/* Add entry button (when not adding) */}
          {!isAddingEntry && (
            <Pressable
              onPress={() => setIsAddingEntry(true)}
              className="mb-4 p-4 rounded-2xl border border-dashed border-neutral-300 items-center justify-center"
            >
              <Ionicons 
                name="add-circle-outline" 
                size={24} 
                color={theme.colors.primary[500]} 
              />
              <ThemedText 
                className="mt-1 font-medium" 
                lightClassName="text-neutral-700" 
                darkClassName="text-neutral-300"
              >
                Add Diary Entry
              </ThemedText>
            </Pressable>
          )}
          
          {/* New entry form */}
          {isAddingEntry && renderNewEntryForm()}
          
          {/* Diary entries */}
          {loading && !refreshing ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <ThemedText className="mt-4" lightClassName="text-neutral-500" darkClassName="text-neutral-400">
                Loading diary entries...
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={entries}
              renderItem={renderEntryCard}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <ThemedView 
                  className="rounded-2xl p-6 items-center justify-center my-8" 
                  lightClassName="bg-white" 
                  darkClassName="bg-neutral-800"
                  style={{ ...theme.shadows.sm }}
                >
                  <Ionicons name="journal-outline" size={48} color={theme.colors.neutral[400]} />
                  <ThemedText 
                    className="text-lg font-medium mt-4 mb-2 text-center" 
                    lightClassName="text-neutral-700" 
                    darkClassName="text-neutral-300"
                  >
                    No diary entries yet
                  </ThemedText>
                  <ThemedText 
                    className="text-center" 
                    lightClassName="text-neutral-500" 
                    darkClassName="text-neutral-500"
                  >
                    Start tracking your plant's progress
                  </ThemedText>
                </ThemedView>
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[theme.colors.primary[500]]}
                  tintColor={theme.colors.primary[500]}
                />
              }
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </>
  );
}
