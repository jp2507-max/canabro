import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        await new Promise(resolve => setTimeout(resolve, 150));
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
    let icon;
    let iconColor;
    
    switch (item.type) {
      case 'indica':
        icon = 'leaf';
        iconColor = '#6B8E23'; // Olive green for indica
        break;
      case 'sativa':
        icon = 'leaf';
        iconColor = '#228B22'; // Forest green for sativa
        break;
      case 'hybrid':
        icon = 'leaf';
        iconColor = '#3CB371'; // Medium sea green for hybrid
        break;
      default:
        icon = 'leaf';
        iconColor = '#2E8B57'; // Sea green default
    }

    return (
      <TouchableOpacity
        key={item.id}
        className="p-3 border-b border-gray-200 flex-row items-center"
        onPress={() => handleSelectStrain(item)}
      >
        <View className="mr-3">
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium">{item.name}</Text>
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500 capitalize">{item.type}</Text>
            {item.thcContent && (
              <Text className="text-xs text-gray-500 ml-2">THC: {item.thcContent}%</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className={`relative ${className}`}>
      <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
        <Ionicons name="search" size={20} color="#666" className="mr-2" />
        <TextInput
          className="flex-1 text-base h-10"
          value={query}
          onChangeText={handleInputChange}
          placeholder={placeholder}
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
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && (
        <View className="absolute top-14 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-md z-10 max-h-64">
          {isLoading ? (
            <View className="p-4 items-center">
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          ) : suggestions.length > 0 ? (
            <View>
              {suggestions.map((item) => renderStrainItem({ item }))}
            </View>
          ) : (
            <View className="p-4 items-center">
              <Text className="text-gray-500">No strains found</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
