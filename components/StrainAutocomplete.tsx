import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Keyboard, useColorScheme } from 'react-native';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { Ionicons } from '@expo/vector-icons';
import { RawStrainApiResponse } from '../lib/types/weed-db';
import { getStrains } from '../lib/services/strain-service';
import { Strain } from '../lib/types/strain';
import darkTheme from '../lib/theme/dark'; // Default import for dark theme
import { theme as lightTheme } from '../lib/theme'; // Named import for light theme from index

interface StrainAutocompleteProps {
  onStrainSelect: (strain: RawStrainApiResponse | null) => void;
  initialStrainName?: string;
  label?: string;
  placeholder?: string;
  inputStyle?: any;
  containerStyle?: any;
  disabled?: boolean;
}

export function StrainAutocomplete({
  onStrainSelect,
  initialStrainName = '',
  label = "Search Strain",
  placeholder = "Type to search...",
  inputStyle = {},
  containerStyle = {},
  disabled = false,
}: StrainAutocompleteProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>(initialStrainName);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(searchTerm);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const currentColorScheme = useColorScheme();
  const isDarkMode = currentColorScheme === 'dark';
  // Define styles outside of the component or memoize it if it depends on props/state not used here (like theme)
  // For now, assuming theme is relatively stable or this is a simplified example.
  // If theme changes frequently and styles depend on it, memoization (useMemo) for styles would be better.
  const theme = isDarkMode ? darkTheme : lightTheme;

  const componentStyles = StyleSheet.create({
    container: {
      position: 'relative',
      width: '100%',
      zIndex: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      padding: 10,
      borderRadius: 5,
      fontSize: 16,
      backgroundColor: theme.colors.neutral[50],
      color: theme.colors.neutral[900],
    },
    focusedInput: {
      borderColor: theme.colors.primary[500],
    },
    suggestionsContainer: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      maxHeight: 200,
      backgroundColor: theme.colors.neutral[100] || '#fff',
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: 5,
      marginTop: 2,
    },
    suggestionItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    suggestionText: {
      fontSize: 16,
      color: theme.colors.neutral[900],
    },
    errorText: {
      color: theme.colors.status.danger,
      marginTop: 5,
    },
    label: {
      fontSize: 16,
      marginBottom: 5,
      color: theme.colors.neutral[900],
      fontWeight: 'bold',
    },
  });

  const debouncedSetSearch = useCallback(
    debounce((text: string) => {
      setDebouncedSearchTerm(text);
    }, 500),
    [],
  );

  useEffect(() => {
    if (searchTerm !== initialStrainName) {
      debouncedSetSearch(searchTerm);
    }
  }, [searchTerm, initialStrainName, debouncedSetSearch]);

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  const {
    data: strainData,
    isLoading,
    error,
  }: UseQueryResult<RawStrainApiResponse[], Error> = useQuery<
    { strains: Strain[]; total: number; hasMore: boolean; }, // Type from queryFn
    Error, // Error type
    RawStrainApiResponse[], // Type after select
    [string, string] // QueryKey type
  >({
    queryKey: ['strains', debouncedSearchTerm],
    queryFn: async (): Promise<{ strains: Strain[]; total: number; hasMore: boolean; }> => {
      if (!debouncedSearchTerm.trim()) {
        return { strains: [], total: 0, hasMore: false };
      }
      return await getStrains({ search: debouncedSearchTerm });
    },    select: (data): RawStrainApiResponse[] => {
      return data.strains.map((strain): RawStrainApiResponse => ({
        api_id: strain.api_id ?? String(strain.id),
        name: strain.name,
        type: strain.species ?? strain.type ?? null,
        genetics: strain.genetics,
        description: Array.isArray(strain.description) ? strain.description.join(', ') : strain.description,
        thc: String(strain.thc),
        cbd: String(strain.cbd),
        floweringTime: strain.floweringTime,
        seed_company: typeof strain.breeder === 'string' ? { name: strain.breeder } : undefined,
        flavors: strain.flavors || [],
        effects: strain.effects || [],
        terpenes: [], // Strain type does not have terpenes, RawStrainApiResponse does not require it.
        image: strain.image || strain.imageUrl || undefined,
        // Ensure all other required fields for RawStrainApiResponse are mapped or have defaults
        // For example, if RawStrainApiResponse requires 'rating', and 'Strain' doesn't have it:
        // rating: 0, // Default value
      }));
    },
    enabled: !!debouncedSearchTerm.trim() && isFocused,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  const handleSelectStrain = (strain: RawStrainApiResponse): void => {
    setSearchTerm(strain.name);
    onStrainSelect(strain);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  return (
    <View style={[componentStyles.container, containerStyle]}>
      {label ? <Text style={componentStyles.label}>{label}</Text> : null}
      <TextInput
        style={[componentStyles.input, isFocused && componentStyles.focusedInput, inputStyle]}
        placeholder={placeholder}
        value={searchTerm}
        onChangeText={setSearchTerm}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Allow touch event on suggestion items to complete first
          setTimeout(() => setIsFocused(false), 100);
        }}
        editable={!disabled}
        placeholderTextColor={theme.colors.neutral[400]}
      />
      {isLoading && isFocused && <ActivityIndicator style={{ marginTop: 10 }} />}
      {error && isFocused && error.message ? (
        <Text style={componentStyles.errorText}>Error: {error.message}</Text>
      ) : null}
      {isFocused && !isLoading && !error && strainData && strainData.length > 0 && (
        <View style={componentStyles.suggestionsContainer}>
          <FlatList
            data={strainData}
            keyExtractor={(item) => item.api_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={componentStyles.suggestionItem}
                onPress={() => handleSelectStrain(item)}
              >
                <Text style={componentStyles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
      {isFocused &&
        !isLoading &&
        !error &&
        strainData &&
        strainData.length === 0 &&
        debouncedSearchTerm.trim() && (
          <View style={componentStyles.suggestionsContainer}>
            <Text style={[componentStyles.suggestionItem, componentStyles.suggestionText]}>
              No strains found.
            </Text>
          </View>
        )}
    </View>
  );
}
