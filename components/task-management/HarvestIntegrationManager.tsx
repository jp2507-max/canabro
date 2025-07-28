import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { log } from '../../lib/utils/logger';

import { Plant } from '../../lib/models/Plant';
import { HarvestPredictionService } from '../../lib/services/HarvestPredictionService';
import { HarvestPreparationAutomator } from '../../lib/services/HarvestPreparationAutomator';
import { PostHarvestScheduler } from '../../lib/services/PostHarvestScheduler';
import { HarvestDataIntegrator } from '../../lib/services/HarvestDataIntegrator';

import { HarvestTimelineView } from './HarvestTimelineView';
import { HarvestPlanningDashboard } from './HarvestPlanningDashboard';
import { HarvestWeightInputModal } from '../ui/HarvestWeightInputModal';

interface HarvestIntegrationManagerProps {
    plants: Plant[];
    onNavigateToPlant?: (plant: Plant) => void;
    onNavigateToTasks?: () => void;
    mode?: 'timeline' | 'dashboard';
}

export const HarvestIntegrationManager: React.FC<HarvestIntegrationManagerProps> = ({
    plants,
    onNavigateToPlant,
    onNavigateToTasks,
    mode = 'dashboard',
}) => {
    const [loading, setLoading] = useState(false);
    const [showHarvestModal, setShowHarvestModal] = useState(false);
    const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

    useEffect(() => {
        // Auto-trigger harvest preparation for eligible plants
        autoTriggerHarvestPreparation();
    }, [plants]);

    const autoTriggerHarvestPreparation = async () => {
        try {
            const floweringPlants = plants.filter(p =>
                ['flowering', 'late-flowering'].includes(p.growthStage) && !p.harvestDate
            );

            if (floweringPlants.length > 0) {
                await HarvestPreparationAutomator.autoTriggerHarvestPreparation(floweringPlants);
            }
        } catch (error) {
            log.error('[HarvestIntegrationManager] Error in auto-trigger:', error);
        }
    };

    const handlePlantHarvest = async (plant: Plant) => {
        Alert.alert(
            'Harvest Plant',
            `Are you ready to harvest ${plant.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Record Harvest',
                    onPress: () => {
                        setSelectedPlant(plant);
                        setShowHarvestModal(true);
                    },
                },
            ]
        );
    };

    const handleHarvestConfirm = async (wetWeightStr?: string) => {
        if (!selectedPlant) return;
        
        setShowHarvestModal(false);
        await processHarvest(selectedPlant, wetWeightStr);
        setSelectedPlant(null);
    };

    const handleHarvestCancel = () => {
        setShowHarvestModal(false);
        setSelectedPlant(null);
    };

    const processHarvest = async (plant: Plant, wetWeightStr?: string) => {
        try {
            setLoading(true);
            log.info(`[HarvestIntegrationManager] Processing harvest for plant ${plant.id}`);

            const wetWeight = wetWeightStr ? parseFloat(wetWeightStr) : undefined;

            // Mark plant as harvested and schedule post-harvest tasks
            await PostHarvestScheduler.markPlantAsHarvested(plant, {
                harvestDate: new Date(),
                wetWeight,
                notes: 'Harvested via harvest integration manager',
            });

            // Update harvest predictions for similar plants
            try {
                const harvestAnalytics = await HarvestDataIntegrator.analyzeHarvestData(plant);
                await HarvestDataIntegrator.updateFutureScheduling(harvestAnalytics);
            } catch (analyticsError) {
                log.error('[HarvestIntegrationManager] Error updating future scheduling:', analyticsError);
                // Don't fail the harvest process if analytics fail
            }

            Alert.alert(
                'Harvest Complete',
                `${plant.name} has been harvested successfully. Post-harvest tasks have been scheduled.`,
                [
                    { text: 'View Tasks', onPress: onNavigateToTasks },
                    { text: 'OK' },
                ]
            );

            log.info(`[HarvestIntegrationManager] Successfully processed harvest for plant ${plant.id}`);
        } catch (error) {
            log.error('[HarvestIntegrationManager] Error processing harvest:', error);
            Alert.alert(
                'Harvest Error',
                'Failed to process harvest. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };



    const handleTasksGenerated = () => {
        Alert.alert(
            'Tasks Generated',
            'Harvest preparation tasks have been created. Would you like to view them?',
            [
                { text: 'Later', style: 'cancel' },
                { text: 'View Tasks', onPress: onNavigateToTasks },
            ]
        );
    };

    let content: React.ReactNode;
    if (loading) {
        content = (
            <ThemedView className="flex-1 justify-center items-center p-4">
                <ThemedText className="text-gray-500 dark:text-gray-400">
                    Processing harvest data...
                </ThemedText>
            </ThemedView>
        );
    } else if (mode === 'timeline') {
        content = (
            <HarvestTimelineView
                plants={plants}
                onPlantPress={onNavigateToPlant}
                onHarvestPress={handlePlantHarvest}
                showAnalytics={true}
            />
        );
    } else {
        content = (
            <HarvestPlanningDashboard
                plants={plants}
                onPlantSelect={onNavigateToPlant}
                onTasksGenerated={handleTasksGenerated}
            />
        );
    }

    return (
        <>
            {content}
            <HarvestWeightInputModal
                visible={showHarvestModal}
                plantName={selectedPlant?.name || ''}
                onCancel={handleHarvestCancel}
                onConfirm={handleHarvestConfirm}
            />
        </>
    );
};

// Utility functions for external use
export const HarvestIntegrationUtils = {
    /**
     * Manually trigger harvest preparation for a specific plant
     */
    async triggerHarvestPreparation(plant: Plant): Promise<void> {
        try {
            log.info(`[HarvestIntegrationUtils] Manually triggering harvest preparation for plant ${plant.id}`);
            await HarvestPreparationAutomator.scheduleHarvestPreparationTasks(plant);
        } catch (error) {
            log.error('[HarvestIntegrationUtils] Error triggering harvest preparation:', error);
            throw error;
        }
    },

    /**
     * Get harvest prediction for a plant
     */
    async getHarvestPrediction(plant: Plant) {
        try {
            return await HarvestPredictionService.predictHarvestDate(plant);
        } catch (error) {
            log.error('[HarvestIntegrationUtils] Error getting harvest prediction:', error);
            throw error;
        }
    },

    /**
     * Process plant harvest with custom data
     */
    async processPlantHarvest(
        plant: Plant,
        harvestData: {
            harvestDate?: Date;
            wetWeight?: number;
            notes?: string;
        }
    ): Promise<void> {
        try {
            log.info(`[HarvestIntegrationUtils] Processing harvest for plant ${plant.id}`);

            await PostHarvestScheduler.markPlantAsHarvested(plant, {
                harvestDate: harvestData.harvestDate || new Date(),
                wetWeight: harvestData.wetWeight,
                notes: harvestData.notes,
            });

            // Update future scheduling based on harvest data
            try {
                const analytics = await HarvestDataIntegrator.analyzeHarvestData(plant);
                await HarvestDataIntegrator.updateFutureScheduling(analytics);
            } catch (analyticsError) {
                log.error('[HarvestIntegrationUtils] Error updating future scheduling:', analyticsError);
                // Don't fail harvest process if analytics fail
            }
        } catch (error) {
            log.error('[HarvestIntegrationUtils] Error processing harvest:', error);
            throw error;
        }
    },

    /**
     * Get harvest analytics for completed plants
     */
    async getHarvestAnalytics(plants: Plant[]) {
        try {
            const harvestedPlants = plants.filter(p => p.harvestDate);
            if (harvestedPlants.length === 0) {
                return null;
            }

            return await HarvestDataIntegrator.compareHarvests(harvestedPlants);
        } catch (error) {
            log.error('[HarvestIntegrationUtils] Error getting harvest analytics:', error);
            throw error;
        }
    },

    /**
     * Generate future planning recommendations
     */
    async getFuturePlanningData(plants: Plant[]) {
        try {
            const harvestedPlants = plants.filter(p => p.harvestDate);
            if (harvestedPlants.length === 0) {
                return null;
            }

            return await HarvestDataIntegrator.generateFuturePlanningData(harvestedPlants);
        } catch (error) {
            log.error('[HarvestIntegrationUtils] Error getting future planning data:', error);
            throw error;
        }
    },
};