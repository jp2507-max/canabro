/**
 * Growth Stage Integration Hook
 * 
 * Comprehensive React hook that integrates all growth stage functionality
 * for the advanced calendar system task management.
 * 
 * This hook provides a unified interface for:
 * - Growth stage monitoring and transitions
 * - Task priority updates based on growth stage
 * - Plant health alerts and emergency task creation
 * - Milestone tracking and celebrations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { log } from '../utils/logger';

import {
  GrowthStageIntegrationService,
  GrowthStageTransition,
  PlantHealthAlert,
  TaskPriorityUpdate,
} from '../services/GrowthStageIntegrationService';
import { PlantTask } from '../models/PlantTask';

export interface GrowthStageIntegrationState {
  transitions: GrowthStageTransition[];
  healthAlerts: PlantHealthAlert[];
  priorityUpdates: TaskPriorityUpdate[];
  celebrations: string[];
  emergencyTasks: PlantTask[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface UseGrowthStageIntegrationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  plantIds?: string[]; // Filter to specific plants
}

/**
 * Main hook for growth stage integration functionality
 */
export function useGrowthStageIntegration(
  options: UseGrowthStageIntegrationOptions = {}
) {
  const { autoRefresh = false, refreshInterval = 300000, plantIds } = options; // 5 min default

  const [state, setState] = useState<GrowthStageIntegrationState>({
    transitions: [],
    healthAlerts: [],
    priorityUpdates: [],
    celebrations: [],
    emergencyTasks: [],
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const runIntegration = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      log.info('[useGrowthStageIntegration] Running comprehensive growth stage integration');

      const result = await GrowthStageIntegrationService.runComprehensiveIntegration();

      setState(prev => ({
        ...prev,
        transitions: result.transitions,
        healthAlerts: result.healthAlerts,
        priorityUpdates: result.priorityUpdates,
        celebrations: result.celebrations,
        emergencyTasks: result.emergencyTasks,
        loading: false,
        lastUpdated: new Date(),
      }));

      log.info('[useGrowthStageIntegration] Integration completed successfully');
    } catch (error) {
      log.error('[useGrowthStageIntegration] Error running integration:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to run growth stage integration'),
        loading: false,
      }));
    }
  }, []);

  // Initial run
  useEffect(() => {
    runIntegration();
  }, [runIntegration]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(runIntegration, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, runIntegration]);

  // Memoized computed values
  const criticalAlerts = useMemo(() => {
    return state.healthAlerts.filter(alert => alert.alertType === 'critical');
  }, [state.healthAlerts]);

  const warningAlerts = useMemo(() => {
    return state.healthAlerts.filter(alert => alert.alertType === 'warning');
  }, [state.healthAlerts]);

  const hasCriticalAlerts = useMemo(() => {
    return criticalAlerts.length > 0;
  }, [criticalAlerts]);

  const hasTransitions = useMemo(() => {
    return state.transitions.length > 0;
  }, [state.transitions]);

  const hasCelebrations = useMemo(() => {
    return state.celebrations.length > 0;
  }, [state.celebrations]);

  const priorityUpdatesCount = useMemo(() => {
    return state.priorityUpdates.length;
  }, [state.priorityUpdates]);

  const emergencyTasksCount = useMemo(() => {
    return state.emergencyTasks.length;
  }, [state.emergencyTasks]);

  // Filter results by plant IDs if specified
  const filteredTransitions = useMemo(() => {
    if (!plantIds || plantIds.length === 0) return state.transitions;
    return state.transitions.filter(t => plantIds.includes(t.plantId));
  }, [state.transitions, plantIds]);

  const filteredHealthAlerts = useMemo(() => {
    if (!plantIds || plantIds.length === 0) return state.healthAlerts;
    return state.healthAlerts.filter(a => plantIds.includes(a.plantId));
  }, [state.healthAlerts, plantIds]);

  const filteredEmergencyTasks = useMemo(() => {
    if (!plantIds || plantIds.length === 0) return state.emergencyTasks;
    return state.emergencyTasks.filter(t => plantIds.includes(t.plantId));
  }, [state.emergencyTasks, plantIds]);

  return {
    // Core state
    transitions: filteredTransitions,
    healthAlerts: filteredHealthAlerts,
    priorityUpdates: state.priorityUpdates,
    celebrations: state.celebrations,
    emergencyTasks: filteredEmergencyTasks,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Computed values
    criticalAlerts,
    warningAlerts,
    hasCriticalAlerts,
    hasTransitions,
    hasCelebrations,
    priorityUpdatesCount,
    emergencyTasksCount,

    // Actions
    refresh: runIntegration,
  };
}

/**
 * Hook for monitoring specific plant growth stage transitions
 */
export function useGrowthStageTransitions(plantIds: string[] = []) {
  const [transitions, setTransitions] = useState<GrowthStageTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const monitorTransitions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allTransitions = await GrowthStageIntegrationService.monitorGrowthStageTransitions();
      
      // Filter by plant IDs if specified
      const filteredTransitions = plantIds.length > 0
        ? allTransitions.filter(t => plantIds.includes(t.plantId))
        : allTransitions;

      setTransitions(filteredTransitions);
      
      log.info(`[useGrowthStageTransitions] Monitored ${filteredTransitions.length} transitions`);
    } catch (error) {
      log.error('[useGrowthStageTransitions] Error monitoring transitions:', error);
      setError(error instanceof Error ? error : new Error('Failed to monitor transitions'));
    } finally {
      setLoading(false);
    }
  }, [plantIds]);

  useEffect(() => {
    monitorTransitions();
  }, [monitorTransitions]);

  return {
    transitions,
    loading,
    error,
    refresh: monitorTransitions,
  };
}

/**
 * Hook for plant health alerts and emergency task creation
 */
export function usePlantHealthAlerts(plantIds: string[] = []) {
  const [alerts, setAlerts] = useState<PlantHealthAlert[]>([]);
  const [emergencyTasks, setEmergencyTasks] = useState<PlantTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyzeHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Analyze plant health
      const healthAlerts = await GrowthStageIntegrationService.analyzePlantHealthForTaskUrgency(
        plantIds.length > 0 ? plantIds : undefined
      );

      setAlerts(healthAlerts);

      // Create emergency tasks for critical alerts
      const criticalAlerts = healthAlerts.filter(alert => alert.alertType === 'critical');
      if (criticalAlerts.length > 0) {
        const emergencyTasks = await GrowthStageIntegrationService.createEmergencyTasksFromHealthAlerts(criticalAlerts);
        setEmergencyTasks(emergencyTasks);
      } else {
        setEmergencyTasks([]);
      }

      log.info(`[usePlantHealthAlerts] Analyzed health for ${plantIds.length || 'all'} plants, found ${healthAlerts.length} alerts`);
    } catch (error) {
      log.error('[usePlantHealthAlerts] Error analyzing plant health:', error);
      setError(error instanceof Error ? error : new Error('Failed to analyze plant health'));
    } finally {
      setLoading(false);
    }
  }, [plantIds]);

  useEffect(() => {
    analyzeHealth();
  }, [analyzeHealth]);

  const criticalAlerts = useMemo(() => {
    return alerts.filter(alert => alert.alertType === 'critical');
  }, [alerts]);

  const warningAlerts = useMemo(() => {
    return alerts.filter(alert => alert.alertType === 'warning');
  }, [alerts]);

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    emergencyTasks,
    loading,
    error,
    refresh: analyzeHealth,
  };
}

/**
 * Hook for task priority updates based on growth stage
 */
export function useTaskPriorityUpdates() {
  const [updates, setUpdates] = useState<TaskPriorityUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updatePriorities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const priorityUpdates = await GrowthStageIntegrationService.updateAllTaskPriorities();
      setUpdates(priorityUpdates);
      setLastUpdated(new Date());

      log.info(`[useTaskPriorityUpdates] Updated ${priorityUpdates.length} task priorities`);
    } catch (error) {
      log.error('[useTaskPriorityUpdates] Error updating task priorities:', error);
      setError(error instanceof Error ? error : new Error('Failed to update task priorities'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updatePriorities();
  }, [updatePriorities]);

  const criticalUpdates = useMemo(() => {
    return updates.filter(update => update.newPriority === 'critical');
  }, [updates]);

  const highPriorityUpdates = useMemo(() => {
    return updates.filter(update => update.newPriority === 'high');
  }, [updates]);

  return {
    updates,
    criticalUpdates,
    highPriorityUpdates,
    loading,
    error,
    lastUpdated,
    refresh: updatePriorities,
  };
}

/**
 * Hook for milestone celebrations
 */
export function useMilestoneCelebrations(plantIds: string[] = []) {
  const [celebrations, setCelebrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const milestones = await GrowthStageIntegrationService.trackMilestoneAchievements(
        plantIds.length > 0 ? plantIds : undefined
      );

      setCelebrations(milestones);

      log.info(`[useMilestoneCelebrations] Tracked milestones for ${plantIds.length || 'all'} plants, found ${milestones.length} celebrations`);
    } catch (error) {
      log.error('[useMilestoneCelebrations] Error tracking milestones:', error);
      setError(error instanceof Error ? error : new Error('Failed to track milestones'));
    } finally {
      setLoading(false);
    }
  }, [plantIds]);

  useEffect(() => {
    trackMilestones();
  }, [trackMilestones]);

  const hasCelebrations = useMemo(() => {
    return celebrations.length > 0;
  }, [celebrations]);

  return {
    celebrations,
    hasCelebrations,
    loading,
    error,
    refresh: trackMilestones,
  };
}