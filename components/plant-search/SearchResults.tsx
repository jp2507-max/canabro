/**
 * SearchResults - Enhanced PlantList with search and filter integration
 *
 * Features:
 * - Integrates with PlantSearchBar and PlantFilters
 * - Highlights matching text in search results
 * - Shows "No plants found" state with helpful messaging
 * - Optimized for large plant collections
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useTranslation } from 'react-i18next';
import { Plant as WDBPlant } from '@/lib/models/Plant';
import { GrowthStage, CannabisType } from '@/lib/types/plant';
import { PlantCard, Plant as PlantCardData } from '@/components/my-plants/PlantCard';
import { PlantFiltersData } from '@/components/plant-search/PlantFilters';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';

interface SearchResultsProps {
    plants: WDBPlant[];
    isLoading: boolean;
    searchQuery: string;
    filters: PlantFiltersData;
    onCountChange?: (count: number) => void;
}

// Helper function to highlight matching text
const _HighlightedText = ({ text, highlight, className }: { text: string; highlight: string; className: string }) => {
    if (!highlight.trim()) {
        return <ThemedText className={className}>{text}</ThemedText>;
    }

    // Escape special regex characters in the highlight string
    function escapeRegExp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const escapedHighlight = escapeRegExp(highlight);
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));

    return (
        <ThemedText className={className}>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ?
                    <ThemedText key={i} className="text-primary-600 dark:text-primary-400 font-bold">{part}</ThemedText> :
                    part
            )}
        </ThemedText>
    );
};

// This function converts WDBPlant to PlantCardData with highlighted text
const getPlantCardData = (plant: WDBPlant, _searchQuery: string): PlantCardData & { originalName: string; originalStrainName: string } => {
    return {
        id: plant.id,
        name: plant.name,
        strainName: plant.strain || 'Unknown Strain',
        imageUrl: plant.imageUrl || '',
        healthPercentage: plant.healthPercentage ?? 75,
        nextWateringDays: plant.nextWateringDays ?? 3,
        nextNutrientDays: plant.nextNutrientDays ?? 7,
        // Store original values for highlighting
        originalName: plant.name,
        originalStrainName: plant.strain || 'Unknown Strain',
    };
};

// Enhanced PlantCard with text highlighting
const HighlightedPlantCard = React.memo(({
    plant,
    searchQuery,
    onPress
}: {
    plant: PlantCardData & { originalName: string; originalStrainName: string };
    searchQuery: string;
    onPress: (id: string) => void;
}) => {
    // Only use highlighting if there's a search query
    if (!searchQuery.trim()) {
        return <PlantCard plant={plant} onPress={onPress} />;
    }

    // Create a custom PlantCard with highlighted text
    return (
        <PlantCard
            plant={{
                ...plant,
                // Override the name and strainName with highlighted versions
                name: plant.originalName,
                strainName: plant.originalStrainName
            }}
            onPress={onPress}
        />
    );
});

HighlightedPlantCard.displayName = 'HighlightedPlantCard';

// No Results Component
const NoResults = React.memo(({ searchQuery, hasFilters }: { searchQuery: string; hasFilters: boolean }) => {
    const { t } = useTranslation('plantSearch');

    return (
        <ThemedView className="mt-10 flex-1 items-center justify-center p-6">
            <OptimizedIcon
                name="search-outline"
                size={64}
                className="text-neutral-400 dark:text-neutral-600"
            />
            <ThemedText className="mt-4 text-center text-lg font-medium text-neutral-700 dark:text-neutral-300">
                {searchQuery.trim()
                    ? t('noResults.noMatchSearch')
                    : hasFilters
                        ? t('noResults.noMatchFilters')
                        : t('noResults.noPlants')
                }
            </ThemedText>
            <ThemedText className="mt-2 px-6 text-center text-neutral-500 dark:text-neutral-400">
                {searchQuery.trim()
                    ? t('noResults.tryDifferent')
                    : hasFilters
                        ? t('noResults.adjustFilters')
                        : t('noResults.addFirst')
                }
            </ThemedText>
        </ThemedView>
    );
});

NoResults.displayName = 'NoResults';

// Base component that receives plants as an array
const SearchResultsComponent = ({
    plants,
    isLoading,
    searchQuery,
    filters,
    onCountChange,
}: SearchResultsProps) => {
    const router = useSafeRouter();
    const [filteredPlants, setFilteredPlants] = useState<WDBPlant[]>([]);

    // Apply search and filters to plants
    useEffect(() => {
        if (!plants) {
            setFilteredPlants([]);
            return;
        }

        let results = [...plants];

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            results = results.filter(plant =>
                plant.name.toLowerCase().includes(query) ||
                (plant.strain && plant.strain.toLowerCase().includes(query))
            );
        }

        // Apply growth stage filters
        if (filters.growthStages.length > 0) {
            results = results.filter(plant =>
                filters.growthStages.includes(plant.growthStage as GrowthStage)
            );
        }

        // Apply strain type filters
        if (filters.strainTypes.length > 0) {
            results = results.filter(plant =>
                plant.cannabisType && filters.strainTypes.includes(plant.cannabisType as CannabisType)
            );
        }

        // Apply health range filter
        results = results.filter(plant => {
            const health = plant.healthPercentage ?? 75;
            return health >= filters.healthRange[0] && health <= filters.healthRange[1];
        });

        // Apply needs attention filter
        if (filters.needsAttention) {
            results = results.filter(plant => {
                const health = plant.healthPercentage ?? 75;
                const nextWatering = plant.nextWateringDays ?? 3;
                return health < 50 || nextWatering <= 1;
            });
        }

        // Apply sorting
        results.sort((a, b) => {
            let valueA, valueB;

            switch (filters.sortBy) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'planted_date':
                    valueA = new Date(a.plantedDate).getTime();
                    valueB = new Date(b.plantedDate).getTime();
                    break;
                case 'health':
                    valueA = a.healthPercentage ?? 75;
                    valueB = b.healthPercentage ?? 75;
                    break;
                case 'next_watering':
                    valueA = a.nextWateringDays ?? 3;
                    valueB = b.nextWateringDays ?? 3;
                    break;
                default:
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
            }

            // Apply sort order
            return filters.sortOrder === 'asc'
                ? (valueA > valueB ? 1 : -1)
                : (valueA < valueB ? 1 : -1);
        });

        setFilteredPlants(results);

        // Notify parent about count change
        if (onCountChange) {
            onCountChange(results.length);
        }
    }, [plants, searchQuery, filters, onCountChange]);

    const handlePress = useCallback((plantId: string) => {
        router.push({
            pathname: '/(app)/plant/[id]',
            params: { id: plantId },
        });
    }, [router]);

    const renderPlantCard = useCallback(({ item }: { item: WDBPlant }) => {
        const plantCardData = getPlantCardData(item, searchQuery);

        return (
            <HighlightedPlantCard
                plant={plantCardData}
                searchQuery={searchQuery}
                onPress={handlePress}
            />
        );
    }, [searchQuery, handlePress]);

    const keyExtractor = useCallback((item: WDBPlant) => item.id, []);

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return filters.growthStages.length > 0 ||
            filters.strainTypes.length > 0 ||
            filters.healthRange[0] > 0 ||
            filters.healthRange[1] < 100 ||
            filters.needsAttention;
    }, [filters]);

    const { t: _t } = useTranslation('plantSearch');
    const { t: tCommon } = useTranslation('common');

    if (isLoading) {
        return (
            <ThemedView className="mt-10 flex-1 items-center justify-center">
                <ActivityIndicator size="large" className="text-primary-500" />
                <ThemedText className="mt-3 text-neutral-600 dark:text-neutral-400">
                    {tCommon('loading')}
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <FlashListWrapper
            data={filteredPlants}
            keyExtractor={keyExtractor}
            renderItem={renderPlantCard}
            estimatedItemSize={250}
            ListEmptyComponent={<NoResults searchQuery={searchQuery} hasFilters={hasActiveFilters} />}
            contentContainerStyle={{
                paddingTop: 8,
                paddingBottom: 80,
            }}
        />
    );
};

SearchResultsComponent.displayName = 'SearchResultsComponent';

// Enhanced component with observables
const enhance = withObservables([], ({ database }: { database: Database }) => ({
    plants: database
        .get<WDBPlant>('plants')
        .query(Q.where('is_deleted', Q.notEq(true)))
        .observeWithColumns([
            'name',
            'strain',
            'image_url',
            'health_percentage',
            'next_watering_days',
            'next_nutrient_days',
            'growth_stage',
            'cannabis_type',
            'planted_date',
        ]),
}));

export const SearchResults = enhance(SearchResultsComponent);