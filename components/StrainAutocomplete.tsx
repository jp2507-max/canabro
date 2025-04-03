import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  // Text, // Prefer ThemedText
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList, // Use FlatList for suggestions
} from 'react-native';

import ThemedText from './ui/ThemedText'; // Import ThemedText
import ThemedView from './ui/ThemedView'; // Import ThemedView
import { useTheme } from '../lib/contexts/ThemeContext'; // Import useTheme
import { searchStrainsByName, Strain } from '../lib/data/strains';

interface StrainAutocompleteProps {
  value: string;
  onSelect: (strain: Strain) => void;
  onInputChange: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function StrainAutocomplete({
  value,
  onSelect,
  onInputChange,
  placeholder = 'Search for a strain...',
  className = '',
}: StrainAutocompleteProps) {
  const { theme, isDarkMode } = useTheme(); // Get theme context
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Strain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Update local state when external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Search for strains when query changes
  useEffect(() => {
    const searchStrains = async () => {
      if (query.length > 0) {
        setIsLoading(true);
        // Simulate network delay for a more realistic experience
        await new Promise((resolve) => setTimeout(resolve, 150));
        const results = searchStrainsByName(query);
        setSuggestions(results);
        setIsLoading(false);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    searchStrains();
  }, [query]);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onInputChange(text);
  };

  const handleSelectStrain = (strain: Strain) => {
    onSelect(strain);
    setQuery(strain.name);
    setShowSuggestions(false);
  };

  const renderStrainItem = ({ item }: { item: Strain }) => {
    // Determine the icon based on strain type
    // Determine the icon based on strain type
    let iconName: keyof typeof Ionicons.glyphMap = 'leaf-outline'; // Default icon
    let iconColor = isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600]; // Default color

    switch (item.type) {
      case 'indica':
        iconName = 'moon-outline';
        iconColor = theme.colors.special.feeding; // Use theme purple for indica
        break;
      case 'sativa':
        iconName = 'sunny-outline';
        iconColor = theme.colors.status.warning; // Use theme orange for sativa
        break;
      case 'hybrid':
        iconName = 'leaf-outline';
        iconColor = theme.colors.primary[500]; // Use theme green for hybrid
        break;
    }

    return (
      <TouchableOpacity
        key={item.id}
        className="flex-row items-center border-b p-3 active:opacity-70"
        style={{ borderColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200] }} // Theme border
        onPress={() => handleSelectStrain(item)}
        accessibilityLabel={`Select strain: ${item.name}, Type: ${item.type}`}
        accessibilityRole="button">
        <ThemedView
          className="mr-3 rounded-full p-1"
          lightClassName="bg-neutral-100"
          darkClassName="bg-neutral-700">
          <Ionicons name={iconName} size={20} color={iconColor} />
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
              {item.type}
            </ThemedText>
            {item.thcContent && (
              <ThemedText
                className="ml-2 text-xs"
                lightClassName="text-neutral-500"
                darkClassName="text-neutral-400">
                THC: {item.thcContent}%
              </ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView className={`relative ${className}`}>
      {/* Input Container */}
      <ThemedView
        className="flex-row items-center rounded-lg border px-3 py-2"
        lightClassName="bg-white border-neutral-300"
        darkClassName="bg-neutral-800 border-neutral-600">
        {/* Wrap Icon in View for styling */}
        <ThemedView className="mr-2">
          <Ionicons
            name="search"
            size={20}
            color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
          />
        </ThemedView>
        <TextInput
          className="h-10 flex-1 text-base"
          style={{ color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800] }} // Theme text color
          value={query}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]} // Theme placeholder
          onFocus={() => query.length > 0 && setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow for selection
            setTimeout(() => setShowSuggestions(false), 200);
          }}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              onInputChange('');
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            accessibilityLabel="Clear search input">
            <Ionicons
              name="close-circle"
              size={20}
              color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
      </ThemedView>

      {/* Suggestions List */}
      {showSuggestions && (
        <ThemedView
          className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-64 overflow-hidden rounded-lg border shadow-lg" // Adjusted position and added overflow
          lightClassName="bg-white border-neutral-300"
          darkClassName="bg-neutral-800 border-neutral-600">
          {isLoading ? (
            <ThemedView className="items-center p-4">
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            </ThemedView>
          ) : suggestions.length > 0 ? (
            // Use FlatList for potentially long suggestion lists
            <FlatList
              data={suggestions}
              renderItem={renderStrainItem}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled" // Allow tapping items without dismissing keyboard
            />
          ) : (
            <ThemedView className="items-center p-4">
              <ThemedText lightClassName="text-neutral-500" darkClassName="text-neutral-400">
                No strains found
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}
