import React, { useState, useRef } from 'react';
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
import { Database, Q } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
import { DiaryEntry } from '../../../lib/models/DiaryEntry';
import { Plant } from '../../../lib/models/Plant';

// Simplified interfaces for props
interface PlantDiaryScreenProps {
  plant: Plant | null;
  diaryEntries: DiaryEntry[];
}

// Base component that receives data from withObservables
function PlantDiaryScreenBase({ plant, diaryEntries }: PlantDiaryScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { sync, isSyncing } = useWatermelon();
  
  const [refreshing, setRefreshing] = useState(false);
  
  // New entry form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryType, setEntryType] = useState<string>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const contentInputRef = useRef<TextInput>(null);

  // Sort entries by date - newest first
  const sortedEntries = [...diaryEntries].sort((a, b) => {
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await sync();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddEntry = async () => {
    if (!plant) return;
    if (!entryContent.trim()) {
      Alert.alert('Error', 'Please enter some content for your diary entry');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await plant.database.write(async () => {
        const entriesCollection = plant.database.get<DiaryEntry>('diary_entries');
        await entriesCollection.create((entry) => {
          entry.plantId = plant.id;
          entry.content = entryContent.trim();
          entry.entryType = entryType;
          entry.entryDate = new Date().toISOString();
          entry.userId = session?.user?.id || '';
        });
      });

      // Clear form and close it
      setEntryTitle('');
      setEntryContent('');
      setEntryType('general');
      setIsAddingEntry(false);
      
      // Sync with Supabase
      sync();

    } catch (error) {
      console.error('Error adding diary entry:', error);
      Alert.alert('Error', 'Failed to add diary entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = (entry: DiaryEntry) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this diary entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await entry.markAsDeleted();
              sync(); // Sync with Supabase
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  // Handle loading state
  if (!plant) {
    return (
      <SafeAreaView className="flex-1">
        <ThemedView 
          className="flex-1 justify-center items-center p-4" 
          lightClassName="bg-white" 
          darkClassName="bg-neutral-900"
        >
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <ThemedText className="mt-4">Loading plant diary...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const renderDiaryEntryItem = ({ item }: { item: DiaryEntry }) => {
    const entryDate = new Date(item.entryDate);
    
    // Get entry type color
    let typeColor = theme.colors.neutral[500];
    let typeBgColor = theme.colors.neutral[100];
    
    if (item.entryType === 'watering') {
      typeColor = theme.colors.primary[600];
      typeBgColor = theme.colors.primary[100];
    } else if (item.entryType === 'feeding') {
      typeColor = theme.colors.status.warning;
      typeBgColor = '#FEF3C7'; // amber-100
    } else if (item.entryType === 'pruning') {
      typeColor = theme.colors.status.success;
      typeBgColor = '#D1FAE5'; // green-100
    } else if (item.entryType === 'issue') {
      typeColor = theme.colors.status.danger;
      typeBgColor = '#FEE2E2'; // red-100
    }
    
    return (
      <ThemedView 
        className="rounded-lg mb-4 p-4 border"
        lightClassName="bg-white border-neutral-200"
        darkClassName="bg-neutral-800 border-neutral-700"
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <ThemedText className="font-bold text-lg">
              {`Entry - ${format(entryDate, 'MMM d, yyyy')}`}
            </ThemedText>
            
            <View className="flex-row items-center mt-1 mb-2">
              <ThemedText 
                className="text-xs mr-2"
                lightClassName="text-neutral-500"
                darkClassName="text-neutral-400"
              >
                {format(entryDate, 'MMM d, yyyy • h:mm a')}
              </ThemedText>
              
              <View 
                style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : typeBgColor, borderRadius: 12 }}
                className="px-2 py-0.5"
              >
                <ThemedText 
                  className="text-xs font-medium capitalize"
                  style={{ color: typeColor }}
                >
                  {item.entryType}
                </ThemedText>
              </View>
            </View>
          </View>
          
          <Pressable
            onPress={() => handleDeleteEntry(item)}
            className="p-2"
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.status.danger} />
          </Pressable>
        </View>
        
        <ThemedText className="mt-1">
          {item.content}
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack.Screen 
        options={{ 
          title: plant?.name ? `${plant.name}'s Diary` : 'Plant Diary',
          headerBackTitle: 'Back',
        }} 
      />
      
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ThemedView 
            className="flex-1 p-4" 
            lightClassName="bg-neutral-50" 
            darkClassName="bg-black"
          >
            {/* Plant Header */}
            <ThemedView
              className="rounded-lg p-4 mb-4 flex-row items-center"
              lightClassName="bg-white"
              darkClassName="bg-neutral-800"
            >
              <View className="h-12 w-12 rounded-full bg-primary-100 items-center justify-center mr-3">
                <Ionicons name="leaf-outline" size={24} color={theme.colors.primary[500]} />
              </View>
              <View className="flex-1">
                <ThemedText className="font-bold text-lg">
                  {plant.name}
                </ThemedText>
                <ThemedText 
                  className="text-sm"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400"
                >
                  {plant.strain} • {plant.growthStage}
                </ThemedText>
              </View>
            </ThemedView>
            
            {/* Diary Entries List */}
            <FlatList
              data={sortedEntries}
              renderItem={renderDiaryEntryItem}
              keyExtractor={(item) => item.id}
              contentContainerClassName="pb-20"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing || isSyncing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary[500]]}
                  tintColor={theme.colors.primary[500]}
                />
              }
              ListEmptyComponent={
                <ThemedView 
                  className="rounded-lg p-6 items-center"
                  lightClassName="bg-white"
                  darkClassName="bg-neutral-800"
                >
                  <Ionicons 
                    name="document-text-outline" 
                    size={48} 
                    color={isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300]} 
                  />
                  <ThemedText 
                    className="text-lg font-bold mt-3 text-center"
                    lightClassName="text-neutral-800"
                    darkClassName="text-neutral-200"
                  >
                    No diary entries yet
                  </ThemedText>
                  <ThemedText 
                    className="text-center mt-1"
                    lightClassName="text-neutral-500"
                    darkClassName="text-neutral-400"
                  >
                    Start keeping track of your plant's journey by adding your first entry!
                  </ThemedText>
                </ThemedView>
              }
            />
            
            {/* Add Entry Button (visible when not adding entry) */}
            {!isAddingEntry && (
              <View className="absolute bottom-4 right-4">
                <Pressable
                  className="h-14 w-14 rounded-full bg-primary-500 items-center justify-center shadow-xl"
                  onPress={() => {
                    setIsAddingEntry(true);
                    setTimeout(() => {
                      contentInputRef.current?.focus();
                    }, 100);
                  }}
                  style={({ pressed }) => [
                    {
                      backgroundColor: 
                        pressed 
                          ? theme.colors.primary[600] 
                          : theme.colors.primary[500],
                      elevation: 4,
                    }
                  ]}
                >
                  <Ionicons name="add" size={28} color="white" />
                </Pressable>
              </View>
            )}
            
            {/* Add Entry Form (shown when isAddingEntry is true) */}
            {isAddingEntry && (
              <ThemedView 
                className="absolute bottom-0 left-0 right-0 p-4 rounded-t-xl shadow-xl border-t"
                lightClassName="bg-white border-neutral-200"
                darkClassName="bg-neutral-800 border-neutral-700"
                style={[{ elevation: 8 }]}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <ThemedText className="font-bold text-lg">
                    New Diary Entry
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      setIsAddingEntry(false);
                      setEntryTitle('');
                      setEntryContent('');
                      setEntryType('general');
                    }}
                  >
                    <Ionicons 
                      name="close" 
                      size={24} 
                      color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} 
                    />
                  </Pressable>
                </View>
                
                {/* Entry Type Selection */}
                <ScrollableEntryTypeSelector 
                  selectedType={entryType}
                  onSelect={setEntryType}
                  isDarkMode={isDarkMode}
                  theme={theme}
                />
                
                {/* Entry Form */}
                <ThemedView
                  className="rounded-lg p-3 mb-3 border"
                  lightClassName="bg-neutral-50 border-neutral-200"
                  darkClassName="bg-neutral-900 border-neutral-700"
                >
                  <TextInput
                    placeholder="Title (optional)"
                    placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                    value={entryTitle}
                    onChangeText={setEntryTitle}
                    className="text-base font-medium mb-1"
                    style={{ color: isDarkMode ? 'white' : 'black' }}
                  />
                  <TextInput
                    ref={contentInputRef}
                    placeholder="What's happening with your plant today?"
                    placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                    value={entryContent}
                    onChangeText={setEntryContent}
                    multiline
                    numberOfLines={4}
                    className="text-base min-h-[100px]"
                    style={{ color: isDarkMode ? 'white' : 'black' }}
                    textAlignVertical="top"
                  />
                </ThemedView>
                
                {/* Submit Button */}
                <Pressable
                  className="bg-primary-500 rounded-lg py-3 items-center"
                  onPress={handleAddEntry}
                  disabled={isSubmitting || !entryContent.trim()}
                  style={({ pressed }) => [
                    {
                      backgroundColor: 
                        isSubmitting || !entryContent.trim()
                          ? theme.colors.neutral[300]
                          : pressed
                            ? theme.colors.primary[600]
                            : theme.colors.primary[500]
                    }
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <ThemedText className="text-white font-bold">Add Entry</ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            )}
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// Type selector component for entry form
function ScrollableEntryTypeSelector({ 
  selectedType, 
  onSelect, 
  isDarkMode, 
  theme 
}: { 
  selectedType: string, 
  onSelect: (type: string) => void, 
  isDarkMode: boolean, 
  theme: any 
}) {
  const options = [
    { id: 'general', label: 'General', icon: 'document-text-outline' },
    { id: 'watering', label: 'Watering', icon: 'water-outline' },
    { id: 'feeding', label: 'Feeding', icon: 'nutrition-outline' },
    { id: 'pruning', label: 'Pruning', icon: 'cut-outline' },
    { id: 'issue', label: 'Issue', icon: 'warning-outline' },
  ];
  
  return (
    <View className="flex-row mb-3 -mx-1">
      {options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => onSelect(option.id)}
          className={`flex-1 items-center justify-center py-2 mx-1 rounded-lg ${selectedType === option.id ? 'bg-primary-100' : ''}`}
          style={[
            { 
              backgroundColor: 
                selectedType === option.id 
                  ? (isDarkMode ? 'rgba(5, 150, 105, 0.2)' : theme.colors.primary[100]) 
                  : (isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100])
            }
          ]}
        >
          <Ionicons 
            name={option.icon as any} 
            size={20} 
            color={
              selectedType === option.id 
                ? theme.colors.primary[500] 
                : (isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500])
            } 
          />
          <ThemedText 
            className={`text-xs mt-1 ${selectedType === option.id ? 'font-bold' : ''}`}
            lightClassName={selectedType === option.id ? 'text-primary-700' : 'text-neutral-600'}
            darkClassName={selectedType === option.id ? 'text-primary-400' : 'text-neutral-400'}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

// Higher-order component to enhance with database
const PlantDiaryScreenWithDatabase = withDatabase(PlantDiaryScreenBase);

// Enhance with observables
const PlantDiaryScreen = withObservables(['route'], ({ database, route }: { database: Database, route: any }) => {
  const plantId = route?.params?.id;
  
  if (!plantId) {
    return {
      plant: null,
      diaryEntries: [],
    };
  }
  
  return {
    plant: database.get<Plant>('plants').findAndObserve(plantId),
    diaryEntries: database.get<DiaryEntry>('diary_entries')
      .query(Q.where('plant_id', plantId))
      .observe()
  };
})(PlantDiaryScreenWithDatabase);

// Wrapper component to handle params
export default function PlantDiaryWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  
  return <PlantDiaryScreen route={{ params: { id } }} />;
}
