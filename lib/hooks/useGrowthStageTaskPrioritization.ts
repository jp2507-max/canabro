/**
 * Growth Stage Task Prioritization Hook
 * 
 * React hook that integrates growth stage task prioritization with existing
 * task reminder system for real-time priority updates and milestone tracking.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { log } from '../utils/logger';

import { 
  GrowthStageTaskPrioritization,
  TaskUrgencyContext,
  MilestoneProgress,
  TaskPriorityFactors
} from '../services/GrowthStageTaskPrioritization';
import { PlantTask } from '../models/PlantTask';
import { Plant } from '../models/Plant';

export interface UseGrowthStageTaskPrioritizationOptions {
  plantId?: string;
  taskId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface TaskPrioritizationState {
  urgencyContext?: TaskUrgencyContext;
  milestoneProgress?: MilestoneProgress;
  celebrations: string[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for single task priority calculation with growth stage integration
 */
export function useGrowthStageTaskPrioritization(
  options: UseGrowthStageTaskPrioritizationOptions = {}
) {
  const { plantId, taskId, autoRefresh = false, refreshInterval = 300000 } = options; // 5 min default
  
  const [state, setState] = useState<TaskPrioritizationState>({
    celebrations: [],
    loading: false,
    error: null,
  });

  const calculatePriority = useCallback(async () => {
    if (!plantId || !taskId) {
      setState(prev => ({
        ...prev,
        urgencyContext: undefined,
        milestoneProgress: undefined,
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Calculate task priority with growth stage integration
      const urgencyContext = await GrowthStageTaskPrioritization.calculateTaskPriority(
        plantId,
        taskId
      );

      // Get celebration milestones
      const celebrations = await GrowthStageTaskPrioritization.getCelebrationMilestones(plantId);

      setState(prev => ({
        ...prev,
        urgencyContext,
        milestoneProgress: urgencyContext.milestoneProgress,
        celebrations,
        loading: false,
      }));

      log.info(`[useGrowthStageTaskPrioritization] Updated priority for task ${taskId}: ${urgencyContext.priorityFactors.finalPriority}`);
    } catch (error) {
      log.error(`[useGrowthStageTaskPrioritization] Error calculating task priority:`, error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to calculate task priority'),
        loading: false,
      }));
    }
  }, [plantId, taskId]);

  // Initial calculation
  useEffect(() => {
    calculatePriority();
  }, [calculatePriority]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || !plantId || !taskId) return;

    const interval = setInterval(calculatePriority, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, calculatePriority, plantId, taskId]);

  // Memoized computed values
  const priorityLevel = useMemo(() => {
    return state.urgencyContext?.priorityFactors.finalPriority || 'medium';
  }, [state.urgencyContext]);

  const priorityReasons = useMemo(() => {
    return state.urgencyContext?.priorityFactors.reasoning || [];
  }, [state.urgencyContext]);

  const isHighPriority = useMemo(() => {
    return priorityLevel === 'high' || priorityLevel === 'critical';
  }, [priorityLevel]);

  const isCritical = useMemo(() => {
    return priorityLevel === 'critical';
  }, [priorityLevel]);

  const stageProgress = useMemo(() => {
    return state.milestoneProgress?.progressPercentage || 0;
  }, [state.milestoneProgress]);

  const isReadyForTransition = useMemo(() => {
    return state.milestoneProgress?.isReadyForTransition || false;
  }, [state.milestoneProgress]);

  return {
    // Core state
    urgencyContext: state.urgencyContext,
    milestoneProgress: state.milestoneProgress,
    celebrations: state.celebrations,
    loading: state.loading,
    error: state.error,
    
    // Computed values
    priorityLevel,
    priorityReasons,
    isHighPriority,
    isCritical,
    stageProgress,
    isReadyForTransition,
    
    // Actions
    refresh: calculatePriority,
  };
}

/**
 * Hook for batch task priority management across multiple plants
 */
export function useBatchTaskPrioritization(plantIds: string[] = []) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updatePriorities = useCallback(async () => {
    if (plantIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      await GrowthStageTaskPrioritization.updateTaskPrioritiesForPlants(plantIds);
      setLastUpdated(new Date());
      
      log.info(`[useBatchTaskPrioritization] Updated priorities for ${plantIds.length} plants`);
    } catch (error) {
      log.error(`[useBatchTaskPrioritization] Error updating batch priorities:`, error);
      setError(error instanceof Error ? error : new Error('Failed to update task priorities'));
    } finally {
      setLoading(false);
    }
  }, [plantIds]);

  // Auto-update when plant IDs change
  useEffect(() => {
    updatePriorities();
  }, [updatePriorities]);

  return {
    loading,
    error,
    lastUpdated,
    updatePriorities,
  };
}

/**
 * Hook for milestone celebrations across all plants
 */
export function usePlantMilestoneCelebrations(plantIds: string[] = []) {
  const [celebrations, setCelebrations] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCelebrations = useCallback(async () => {
    if (plantIds.length === 0) {
      setCelebrations({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const celebrationPromises = plantIds.map(async (plantId) => {
        const plantCelebrations = await GrowthStageTaskPrioritization.getCelebrationMilestones(plantId);
        return { plantId, celebrations: plantCelebrations };
      });

      const results = await Promise.all(celebrationPromises);
      
      const celebrationMap = results.reduce((acc, { plantId, celebrations }) => {
        if (celebrations.length > 0) {
          acc[plantId] = celebrations;
        }
        return acc;
      }, {} as Record<string, string[]>);

      setCelebrations(celebrationMap);
      
      log.info(`[usePlantMilestoneCelebrations] Loaded celebrations for ${Object.keys(celebrationMap).length} plants`);
    } catch (error) {
      log.error(`[usePlantMilestoneCelebrations] Error loading celebrations:`, error);
      setError(error instanceof Error ? error : new Error('Failed to load milestone celebrations'));
    } finally {
      setLoading(false);
    }
  }, [plantIds]);

  // Load celebrations when plant IDs change
  useEffect(() => {
    loadCelebrations();
  }, [loadCelebrations]);

  // Memoized computed values
  const totalCelebrations = useMemo(() => {
    return Object.values(celebrations).flat().length;
  }, [celebrations]);

  const hasCelebrations = useMemo(() => {
    return totalCelebrations > 0;
  }, [totalCelebrations]);

  const celebrationsByPlant = useMemo(() => {
    return celebrations;
  }, [celebrations]);

  return {
    celebrations: celebrationsByPlant,
    totalCelebrations,
    hasCelebrations,
    loading,
    error,
    refresh: loadCelebrations,
  };
}

/**
 * Hook for priority-based task filtering and sorting
 */
export function usePriorityTaskFiltering(tasks: PlantTask[] = []) {
  const [prioritizedTasks, setPrioritizedTasks] = useState<PlantTask[]>([]);
  const [loading, setLoading] = useState(false);

  const prioritizeTasks = useCallback(async () => {
    if (tasks.length === 0) {
      setPrioritizedTasks([]);
      return;
    }

    setLoading(true);

    try {
      // Calculate priorities for all tasks
      const taskPriorityPromises = tasks.map(async (task) => {
        try {
          const urgencyContext = await GrowthStageTaskPrioritization.calculateTaskPriority(
            task.plantId,
            task.id
          );
          return {
            task,
            priority: urgencyContext.priorityFactors.finalPriority,
            urgencyScore: urgencyContext.priorityFactors.growthStageUrgency +
                         urgencyContext.priorityFactors.healthUrgency +
                         urgencyContext.priorityFactors.environmentalUrgency +
                         urgencyContext.priorityFactors.timeUrgency,
          };
        } catch (error) {
          log.warn(`[usePriorityTaskFiltering] Failed to calculate priority for task ${task.id}:`, error);
          return {
            task,
            priority: task.priorityLevel,
            urgencyScore: 0.5, // Default moderate urgency
          };
        }
      });

      const taskPriorities = await Promise.all(taskPriorityPromises);

      // Sort by priority and urgency score
      const priorityOrder: Record<'low' | 'medium' | 'high' | 'critical', number> = { 
        critical: 4, high: 3, medium: 2, low: 1 
      };
      const sortedTasks = taskPriorities
        .sort((a, b) => {
          const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
          if (priorityDiff !== 0) return priorityDiff;
          return b.urgencyScore - a.urgencyScore;
        })
        .map(({ task }) => task);

      setPrioritizedTasks(sortedTasks);
      
      log.info(`[usePriorityTaskFiltering] Prioritized ${sortedTasks.length} tasks`);
    } catch (error) {
      log.error(`[usePriorityTaskFiltering] Error prioritizing tasks:`, error);
      setPrioritizedTasks(tasks); // Fallback to original order
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  // Re-prioritize when tasks change
  useEffect(() => {
    prioritizeTasks();
  }, [prioritizeTasks]);

  // Memoized filtered task groups
  const criticalTasks = useMemo(() => {
    return prioritizedTasks.filter(task => task.priorityLevel === 'critical');
  }, [prioritizedTasks]);

  const highPriorityTasks = useMemo(() => {
    return prioritizedTasks.filter(task => task.priorityLevel === 'high');
  }, [prioritizedTasks]);

  const mediumPriorityTasks = useMemo(() => {
    return prioritizedTasks.filter(task => task.priorityLevel === 'medium');
  }, [prioritizedTasks]);

  const lowPriorityTasks = useMemo(() => {
    return prioritizedTasks.filter(task => task.priorityLevel === 'low');
  }, [prioritizedTasks]);

  return {
    prioritizedTasks,
    criticalTasks,
    highPriorityTasks,
    mediumPriorityTasks,
    lowPriorityTasks,
    loading,
    refresh: prioritizeTasks,
  };
}