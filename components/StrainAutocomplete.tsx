import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Keyboard, useColorScheme, ScrollView } from 'react-native';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { Ionicons } from '@expo/vector-icons';
import { RawStrainApiResponse } from '../lib/types/weed-db';
import { searchStrainsIntelligent } from '../lib/services/strain-search.service';
import darkTheme from '../lib/theme/dark';
import { theme as lightTheme } from '../lib/theme';

interface StrainAutocompleteProps {
  onStrainSelect: (strain: RawStrainApiResponse | null) => void;
  initialStrainName?: string;
  label?: string;
  placeholder?: string;
  inputStyle?: any;
  containerStyle?: any;
  disabled?: boolean;
  limit?: number;
}

export function StrainAutocomplete({
  onStrainSelect,
  initialStrainName = '',
  label = "Search Strain",
  placeholder = "Type to search...",
  inputStyle = {},
  containerStyle = {},
  disabled = false,
  limit = 10,
}: StrainAutocompleteProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>(initialStrainName);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(searchTerm);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const currentColorScheme = useColorScheme();
  const isDarkMode = currentColorScheme === 'dark';
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
      zIndex: 1000,
    },
    suggestionItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    suggestionText: {
      fontSize: 16,
      color: theme.colors.neutral[900],
      flex: 1,
    },
    sourceIndicator: {
      fontSize: 12,
      color: theme.colors.neutral[500],
      fontStyle: 'italic',
    },
    sourceLabel: {
      fontSize: 10,
      color: theme.colors.neutral[600],
      backgroundColor: theme.colors.neutral[100],
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
      textAlign: 'center',
      fontWeight: '500',
    },
    errorText: {
      color: theme.colors.status?.danger || '#ff0000',
      marginTop: 5,
    },
    label: {
      fontSize: 16,
      marginBottom: 5,
      color: theme.colors.neutral[900],
      fontWeight: 'bold',
    },
    sourceHeader: {
      padding: 8,
      backgroundColor: theme.colors.neutral[50],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    sourceHeaderText: {
      fontSize: 12,
      color: theme.colors.neutral[600],
    },
  });

  const debouncedSetSearch = useCallback(
    debounce((text: string) => {
      setDebouncedSearchTerm(text);
    }, 300),
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
    data: searchResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['strains-intelligent', debouncedSearchTerm, limit],
    queryFn: async () => {
      if (!debouncedSearchTerm.trim()) {
        return { strains: [], sources: { local: 0, supabase: 0, external: 0 }, hasMore: false };
      }
      
      console.log(`[StrainAutocomplete] Searching for "${debouncedSearchTerm}" using intelligent search`);
      
      const results = await searchStrainsIntelligent(debouncedSearchTerm, limit);
      
      console.log(`[StrainAutocomplete] Found ${results.strains.length} results for "${debouncedSearchTerm}"`, {
        sources: results.sources,
        hasMore: results.hasMore
      });
      
      return results;
    },
    enabled: !!debouncedSearchTerm.trim() && isFocused,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });  const strainData = searchResult?.strains || [];
  const sources = searchResult?.sources || { local: 0, supabase: 0, external: 0 };
  const hasMore = searchResult?.hasMore || false;

  const getSourceLabel = (source?: string): string => {
    switch (source) {
      case 'local': return 'Local';
      case 'supabase': return 'Supabase';
      case 'cloud': return 'Cloud';
      case 'external': return 'External';
      default: return 'Unknown';
    }
  };

  const handleSelectStrain = (strain: RawStrainApiResponse): void => {
    console.log(`[StrainAutocomplete] Strain selected: ${strain.name} (API ID: ${strain.api_id})`);
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
          setTimeout(() => setIsFocused(false), 100);
        }}
        editable={!disabled}
        placeholderTextColor={theme.colors.neutral[400]}
        accessibilityLabel={label || "Search for cannabis strains"}
        accessibilityHint="Type to search for strains from your saved collection, cloud database, or external sources"
        accessibilityRole="search"
      />
      
      {isLoading && isFocused && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          <Text style={{ marginLeft: 8, color: theme.colors.neutral[600] }}>
            {debouncedSearchTerm.length <= 3 
              ? "Searching comprehensive strain database..." 
              : "Searching your saved strains..."}
          </Text>
        </View>
      )}
      
      {error && isFocused && error.message && (
        <Text style={componentStyles.errorText}>Error: {error.message}</Text>
      )}
      
      {isFocused && !isLoading && !error && strainData && strainData.length > 0 && (
        <View style={componentStyles.suggestionsContainer}>
          {(sources.local > 0 || sources.supabase > 0 || sources.external > 0) && (
            <View 
              style={componentStyles.sourceHeader}              accessibilityRole="text"
              accessibilityLabel={`Search results: ${sources.local} saved locally, ${sources.supabase} from supabase, ${sources.external} from external sources`}
            >
              <Text style={componentStyles.sourceHeaderText}>
                {sources.local > 0 && `${sources.local} saved`}
                {sources.local > 0 && (sources.supabase > 0 || sources.external > 0) && ' • '}
                {sources.supabase > 0 && `${sources.supabase} supabase`}
                {sources.supabase > 0 && sources.external > 0 && ' • '}
                {sources.external > 0 && `${sources.external} external`}
                {hasMore && ' • Type more for refined results'}
              </Text>
            </View>
          )}
          
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 200 }}
          >
            {strainData.map((item, index) => (
              <TouchableOpacity
                key={item.api_id || `strain-${index}`}
                style={componentStyles.suggestionItem}
                onPress={() => handleSelectStrain(item)}                accessibilityLabel={`Select strain ${item.name}${item.type ? `, ${item.type} type` : ''}`}
                accessibilityHint={`From ${getSourceLabel(item._source).toLowerCase()} source`}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={componentStyles.suggestionText}>{item.name}</Text>
                  {item.type && (
                    <Text style={[componentStyles.sourceIndicator, { marginTop: 2 }]}>
                      {item.type}
                    </Text>
                  )}
                </View>                <Text style={componentStyles.sourceLabel}>
                  {getSourceLabel(item._source)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
              No strains found. Try a different spelling or fewer characters.
            </Text>
          </View>
        )}
    </View>
  );
}
