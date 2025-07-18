/**
 * PlantSearchScreen - Integrated search and filter screen for plants
 *
 * Features:
 * - Combines PlantSearchBar, PlantFilters, and SearchResults
 * - Manages search and filter state
 * - Provides count of matching plants
 * - Optimized for performance with large collections
 */
import React, { useState, useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useTranslation } from 'react-i18next';
import { PlantSearchBar, PlantFilters, PlantFiltersData, SearchResults } from '@/components/plant-search';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { GrowthStage, CannabisType } from '@/lib/types/plant';

// Default filter state
const DEFAULT_FILTERS: PlantFiltersData = {
  growthStages: [],
  healthRange: [0, 100],
  strainTypes: [],
  needsAttention: false,
  sortBy: 'name',
  sortOrder: 'asc',
};

export function PlantSearchScreen() {
  const database = useDatabase();
  const { t } = useTranslation('plantSearch');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PlantFiltersData>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  // Check if any filters are active
  const hasActiveFilters = React.useMemo(() => {
    return filters.growthStages.length > 0 || 
           filters.strainTypes.length > 0 || 
           filters.healthRange[0] > 0 || 
           filters.healthRange[1] < 100 ||
           filters.needsAttention;
  }, [filters]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFilterPress = useCallback(() => {
    setShowFilters(true);
  }, []);

  const handleFiltersClose = useCallback(() => {
    setShowFilters(false);
  }, []);

  const handleFiltersChange = useCallback((newFilters: PlantFiltersData) => {
    setFilters(newFilters);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleCountChange = useCallback((count: number) => {
    setResultCount(count);
  }, []);

  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Search Bar */}
      <PlantSearchBar
        onSearchChange={handleSearchChange}
        onFilterPress={handleFilterPress}
        showFilterBadge={hasActiveFilters}
        initialValue={searchQuery}
        placeholder={t('searchPlaceholder')}
      />
      
      {/* Results Count */}
      <ThemedView className="flex-row items-center justify-between px-4 pb-2">
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('plantsFound', { count: resultCount })}
        </ThemedText>
        
        {hasActiveFilters && (
          <ThemedText 
            className="text-sm font-medium text-primary-600 dark:text-primary-400"
            onPress={handleClearAllFilters}
          >
            {t('clearFilters')}
          </ThemedText>
        )}
      </ThemedView>
      
      {/* Search Results */}
      <SearchResults
        database={database}
        searchQuery={searchQuery}
        filters={filters}
        onCountChange={handleCountChange}
      />
      
      {/* Filters Modal */}
      <PlantFilters
        visible={showFilters}
        onClose={handleFiltersClose}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearAll={handleClearAllFilters}
      />
    </ThemedView>
  );
}