import React, { useState, useRef } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, UseQueryResult, QueryKey } from '@tanstack/react-query';

import { useTheme } from '../lib/contexts/ThemeContext';
import ThemedText from './ui/ThemedText';
import ThemedView from './ui/ThemedView';
import { WeedDbService } from '../lib/services/weed-db.service';
import { Strain } from '../lib/types/weed-db';
import { ensureUuid } from '../lib/utils/uuid';
import { useDebounce } from '../lib/hooks/useDebounce';

interface StrainSearchResponse { // Define the expected response structure
  data: Strain[];
}

interface StrainAutocompleteProps {
  value: string;
  onSelect: (strain: Strain | null) => void;
  onInputChange: (text: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function StrainAutocomplete({
  value,
  onSelect,
  onInputChange,
  placeholder = 'Search for a strain...',
  className = '',
  error,
}: StrainAutocompleteProps) {
  const { theme, isDarkMode } = useTheme();
  const [query, setQuery] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debouncedSearchTerm = useDebounce(query, 300);

  const {
    data: queryData, // Renamed from searchResults to queryData to hold the { data: Strain[] } object
    isLoading,
    isFetching,
    isError,
    error: queryError,
  }: UseQueryResult<StrainSearchResponse, Error> = useQuery<StrainSearchResponse, Error, StrainSearchResponse, QueryKey>({
    queryKey: ['strains', 'search', debouncedSearchTerm],
    queryFn: () => WeedDbService.search(debouncedSearchTerm), // Assuming this returns Promise<StrainSearchResponse>
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });

  // Update local state when external value changes
  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onInputChange(text);
    
    if (text.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      onSelect(null); // Ensure onSelect is called with null when input is cleared
    }
  };

  const handleSelectStrain = (strain: Strain) => {
    // Ensure the strain has a valid UUID for Supabase compatibility
    const strainWithUuid = {
      ...strain,
      id: ensureUuid(strain.id || '') || strain.id
    };

    console.log('[StrainAutocomplete] Strain selected:', strainWithUuid);
    
    setQuery(strain.name || '');
    setShowSuggestions(false);
    onSelect(strainWithUuid);
    
    // Remove focus from input
    if (inputRef.current) inputRef.current.blur();
  };

  // Render strain type icon based on the strain's type
  const renderStrainTypeIcon = (type: string = '') => {
    const lowerType = type.toLowerCase();
    
    let iconName: keyof typeof Ionicons.glyphMap = 'leaf-outline'; 
    let iconColor = isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600];

    if (lowerType.includes('indica')) {
      iconName = 'moon-outline';
      iconColor = theme.colors.special.feeding;
    } else if (lowerType.includes('sativa')) {
      iconName = 'sunny-outline';
      iconColor = theme.colors.status.warning;
    } else if (lowerType.includes('hybrid')) {
      iconName = 'leaf-outline';
      iconColor = theme.colors.primary[500];
    }

    return <Ionicons name={iconName} size={20} color={iconColor} />;
  };

  const renderStrainItem = ({ item }: { item: Strain }) => {
    return (
      <TouchableOpacity
        key={item.id}
        className="flex-row items-center border-b p-3 active:opacity-70"
        style={{ borderColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200] }}
        onPress={() => handleSelectStrain(item)}
        accessibilityLabel={`Select strain: ${item.name}, Type: ${item.type}`}
        accessibilityRole="button">
        <ThemedView
          className="mr-3 rounded-full p-1"
          lightClassName="bg-neutral-100"
          darkClassName="bg-neutral-700">
          {renderStrainTypeIcon(item.type)}
        </ThemedView>
        <View className="flex-1">
          <ThemedText
            className="text-base font-medium"
            lightClassName="text-neutral-800"
            darkClassName="text-neutral-100">
            {item.name}
          </ThemedText>
          <View className="mt-0.5 flex-row items-center">
            <ThemedText
              className="text-xs capitalize"
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-400">
              {item.type || 'Unknown type'}
            </ThemedText>
            {/* Ensure floweringTime is optional on Strain type or handle its absence */}
            {item.floweringTime && (
              <ThemedText
                className="ml-2 text-xs"
                lightClassName="text-neutral-500"
                darkClassName="text-neutral-400">
                Flower: ~{item.floweringTime} weeks
              </ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const strainsArray: Strain[] = queryData?.data ?? []; // Extracted array, defaults to empty array

  const isSearching = isLoading || isFetching;
  const hasResults = strainsArray.length > 0;
  const showNoResults = !isSearching && debouncedSearchTerm.length >= 2 && !hasResults;

  return (
    <View className={`relative ${className} ${error ? 'mb-6' : 'mb-0'}`}>
      {/* Input Container */}
      <ThemedView
        className={`flex-row items-center rounded-lg border px-3 py-2 ${error ? 'border-red-500' : ''}`}
        lightClassName={`bg-white ${error ? 'border-red-500' : 'border-neutral-300'}`}
        darkClassName={`bg-neutral-800 ${error ? 'border-red-500' : 'border-neutral-600'}`}>
        {/* Wrap Icon in View for styling */}
        <ThemedView className="mr-2">
          <Ionicons
            name="search"
            size={20}
            color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
          />
        </ThemedView>
        <TextInput
          ref={inputRef}
          className="h-10 flex-1 text-base"
          style={{ color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800] }}
          value={query}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
          onFocus={() => {
            if (query.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay hiding suggestions to allow for selection
            setTimeout(() => setShowSuggestions(false), 200);
          }}
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} style={styles.icon} />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              onInputChange('');
              setShowSuggestions(false);
              onSelect(null);
            }}
            accessibilityLabel="Clear search input">
            <Ionicons
              name="close-circle"
              size={20}
              color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>
        ) : null}
      </ThemedView>

      {/* Error message */}
      {error && (
        <ThemedText className="absolute -bottom-6 left-0 mt-1 text-xs text-red-500">
          {error}
        </ThemedText>
      )}

      {/* Suggestions Dropdown - Only show when the input is focused and has content */}
      {showSuggestions && (
        <ThemedView
          style={styles.suggestionsContainer}
          lightClassName="bg-white border-neutral-300"
          darkClassName="bg-neutral-800 border-neutral-600">
          {isSearching && !hasResults && debouncedSearchTerm.length >= 2 ? (
            <ThemedView className="items-center p-4">
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            </ThemedView>
          ) : hasResults ? (
            <FlatList
              data={strainsArray}
              renderItem={renderStrainItem}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              keyboardShouldPersistTaps="handled"
              style={styles.flatList}
              contentContainerStyle={styles.flatListContent}
              maxToRenderPerBatch={10}
              initialNumToRender={10}
              removeClippedSubviews={true}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              // Add these to better handle the parent scrolling and reduce conflicts
              disableScrollViewPanResponder={true}
              persistentScrollbar={true}
            />
          ) : showNoResults ? (
            <ThemedView className="items-center p-4">
              <ThemedText lightClassName="text-neutral-500" darkClassName="text-neutral-400">
                No strains found matching "{debouncedSearchTerm}"
              </ThemedText>
            </ThemedView>
          ) : null}
        </ThemedView>
      )}
    </View>
  );
}

// Add StyleSheet for dropdown positioning
const styles = StyleSheet.create({
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    maxHeight: 300,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flatList: {
    flexGrow: 0,
    maxHeight: 300,
  },
  flatListContent: {
    flexGrow: 0,
  },
  icon: {
    marginRight: 8,
  },
});

export default StrainAutocomplete;
