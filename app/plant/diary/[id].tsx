import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import supabase from '../../../lib/supabase';
import { useAuth } from '../../../lib/contexts/AuthProvider';
import { useTheme } from '../../../lib/contexts/ThemeContext';
import ThemedView from '../../../components/ui/ThemedView';
import ThemedText from '../../../components/ui/ThemedText';
import { isExpoGo, authConfig } from '../../../lib/config';

// Interfaces for diary entries and plant
interface DiaryEntry {
  id: string;
  plant_id: string;
  title: string;
  content: string;
  entry_type: 'general' | 'watering' | 'feeding' | 'pruning' | 'transplant' | 'harvest' | 'problem';
  entry_date: string;
  created_at: string;
  updated_at: string;
}

interface Plant {
  id: string;
  name: string;
  strain: string;
  status: string;
  current_stage: string;
  image_url?: string;
}

// Mock data for development
const MOCK_PLANT: Plant = {
  id: '1',
  name: 'Northern Lights',
  strain: 'Northern Lights',
  status: 'growing',
  current_stage: 'vegetative',
  image_url: 'https://example.com/plant.jpg'
};

const MOCK_ENTRIES: DiaryEntry[] = [
  {
    id: '1',
    plant_id: '1',
    title: 'Started Germination',
    content: 'Placed seeds in water for 24 hours before transferring to soil.',
    entry_type: 'general',
    entry_date: new Date(2024, 2, 15).toISOString(),
    created_at: new Date(2024, 2, 15).toISOString(),
    updated_at: new Date(2024, 2, 15).toISOString()
  },
  {
    id: '2',
    plant_id: '1',
    title: 'First Watering',
    content: 'Watered with 500ml of pH 6.5 water.',
    entry_type: 'watering',
    entry_date: new Date(2024, 2, 17).toISOString(),
    created_at: new Date(2024, 2, 17).toISOString(),
    updated_at: new Date(2024, 2, 17).toISOString()
  },
  {
    id: '3',
    plant_id: '1',
    title: 'First True Leaves',
    content: 'Seedling has developed its first set of true leaves. Growth looks healthy.',
    entry_type: 'general',
    entry_date: new Date(2024, 2, 20).toISOString(),
    created_at: new Date(2024, 2, 20).toISOString(),
    updated_at: new Date(2024, 2, 20).toISOString()
  }
];

export default function PlantDiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  
  const [plant, setPlant] = useState<Plant | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New entry form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryType, setEntryType] = useState<DiaryEntry['entry_type']>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const contentInputRef = useRef<TextInput>(null);

  // Fetch plant information
  const fetchPlant = async () => {
    try {
      if (isExpoGo && authConfig.forceDevBypass) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setPlant(MOCK_PLANT);
        return;
      }

      if (!session?.user || !id) {
        throw new Error('Not authenticated or missing plant ID');
      }

      const { data, error: queryError } = await supabase
        .from('plants')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (queryError) throw queryError;
      if (!data) throw new Error('Plant not found');
      
      setPlant(data);
    } catch (err) {
      console.error('Error fetching plant:', err);
      setError('Failed to load plant information');
    }
  };

  // Fetch diary entries for this plant
  const fetchEntries = async () => {
    try {
      if (isExpoGo && authConfig.forceDevBypass) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setEntries(MOCK_ENTRIES);
        setError(null);
        return;
      }

      if (!session?.user || !id) {
        throw new Error('Not authenticated or missing plant ID');
      }

      const { data, error: queryError } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('plant_id', id)
        .order('entry_date', { ascending: false });

      if (queryError) throw queryError;
      
      setEntries(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching diary entries:', err);
      setError('Failed to load diary entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      await fetchPlant();
      await fetchEntries();
    };
    
    loadData();
  }, [id, session]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPlant();
    fetchEntries();
  };

  // Handle adding new entry
  const handleAddEntry = async () => {
    if (!entryTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your diary entry');
      return;
    }

    if (!entryContent.trim()) {
      Alert.alert('Missing Content', 'Please enter content for your diary entry');
      return;
    }

    try {
      setIsSubmitting(true);

      // For development in Expo Go
      if (isExpoGo && authConfig.forceDevBypass) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const newEntry: DiaryEntry = {
          id: Date.now().toString(),
          plant_id: id || '1',
          title: entryTitle,
          content: entryContent,
          entry_type: entryType,
          entry_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setEntries([newEntry, ...entries]);
        setEntryTitle('');
        setEntryContent('');
        setEntryType('general');
        setIsAddingEntry(false);
        return;
      }

      if (!session?.user || !id) {
        throw new Error('Not authenticated or missing plant ID');
      }

      const newEntry = {
        plant_id: id,
        title: entryTitle,
        content: entryContent,
        entry_type: entryType,
        entry_date: new Date().toISOString(),
        user_id: session.user.id
      };

      const { data, error: insertError } = await supabase
        .from('diary_entries')
        .insert(newEntry)
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Add the new entry to the top of the list
      if (data) {
        setEntries([data, ...entries]);
      }
      
      // Reset form
      setEntryTitle('');
      setEntryContent('');
      setEntryType('general');
      setIsAddingEntry(false);
      
    } catch (err) {
      console.error('Error adding diary entry:', err);
      Alert.alert('Error', 'Failed to add diary entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel adding entry
  const handleCancelEntry = () => {
    setEntryTitle('');
    setEntryContent('');
    setEntryType('general');
    setIsAddingEntry(false);
  };

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
    const types: Array<{ type: DiaryEntry['entry_type']; label: string }> = [
      { type: 'general', label: 'General' },
      { type: 'watering', label: 'Watering' },
      { type: 'feeding', label: 'Feeding' },
      { type: 'pruning', label: 'Pruning' },
      { type: 'transplant', label: 'Transplant' },
      { type: 'harvest', label: 'Harvest' },
      { type: 'problem', label: 'Problem' }
    ];
    
    return (
      <FlatList
        horizontal
        data={types}
        keyExtractor={(item) => item.type}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = entryType === item.type;
          return (
            <Pressable
              className={`mr-2 py-1 px-3 rounded-full border ${isSelected ? 'border-primary-500' : 'border-neutral-300'}`}
              style={isSelected ? { backgroundColor: `${getEntryColor(item.type)}20` } : {}}
              onPress={() => setEntryType(item.type)}
            >
              <View className="flex-row items-center">
                <Ionicons 
                  name={getEntryIcon(item.type)} 
                  size={16} 
                  color={isSelected ? getEntryColor(item.type) : theme.colors.neutral[400]} 
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
  const renderEntryCard = ({ item }: { item: DiaryEntry }) => {
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
                style={{ backgroundColor: `${getEntryColor(item.entry_type)}20` }}
              >
                <Ionicons 
                  name={getEntryIcon(item.entry_type)} 
                  size={16} 
                  color={getEntryColor(item.entry_type)}
                />
              </View>
              <ThemedText 
                className="text-xs uppercase font-medium" 
                lightClassName="text-neutral-600" 
                darkClassName="text-neutral-400"
              >
                {item.entry_type}
              </ThemedText>
            </View>
            
            <ThemedText 
              className="text-sm" 
              lightClassName="text-neutral-500" 
              darkClassName="text-neutral-500"
            >
              {formatDate(item.entry_date)}
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
              onPress={handleCancelEntry}
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
                  {plant.strain} • {plant.current_stage}
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
                  onRefresh={onRefresh}
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
