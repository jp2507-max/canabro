/**
 * Optimized Task Data Hook - Performance Optimized for 5-Day Focus
 * 
 * High-performance React hook for managing task data with:
 * - 5-day focus window (current week ±2 days)
 * - Efficient LRU caching with automatic cleanup
 * - Intelligent prefetching for adjacent days
 * - Background processing to avoid UI blocking
 * - Stable component references with useCallback/useMemo
 * 
 * Performance targets:
 * - Handle 100+ plants with 1000+ tasks
 * - Sub-100ms data loading for 5-day window
 * - Memory usage under 50MB for cached data
 * - Smooth 60fps scrolling performance
 * 
 * Requirements: R1-AC5, R5-AC3
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';

import { PlantTask } from '@/lib/models/PlantTask';
import { Plant } from '@/lib/models/Plant';
import { database } from '@/lib/models';
import { Logger } from '@/lib/utils/production-utils';
import { addDays, startOfDay, format } from '@/lib/utils/date';

// Cache configuration
const CACHE_SIZE = 14; // Maximum days to cache (2 weeks)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_PROCESSING_DELAY = 16; // 1 frame delay for background processing

interface TaskCacheEntry {
  tasks: PlantTask[];
  timestamp: number;
  lastAccessed: number;
  isLoading: boolean;
}

interface TaskCache {
  [dateKey: string]: TaskCacheEntry;
}

interface UseOptimizedTaskDataOptions {
  selectedDate: Date;
  plantId?: string;
  showCompleted?: boolean;
  enablePrefetching?: boolean;
  enableCaching?: boolean;
  cacheSize?: number;
  focusWindowSize?: number; // Number of days in focus window
}

interface UseOptimizedTaskDataReturn {
  // Core data
  tasks: PlantTask[];
  plants: Plant[];
  plantMap: Map<string, Plant>;
  tasksByDate: Map<string, PlantTask[]>;
  
  // Focus window
  focusStartDate: Date;
  focusEndDate: Date;
  focusDateRange: Date[];
  
  // Performance metrics
  cacheStats: {
    hitRate: number;
    totalEntries: number;
    memoryUsage: number;
  };
  
  // Loading states
  loading: boolean;
  prefetching: boolean;
  
  // Actions
  triggerRefresh: () => void;
  clearCache: () => void;
  prefetchAdjacentDays: (direction: 'forward' | 'backward' | 'both') => Promise<void>;
}

/**
 * Performance-optimized task data hook with 5-day focus and intelligent caching
 */
export function useOptimizedTaskData(
  options: UseOptimizedTaskDataOptions
): UseOptimizedTaskDataReturn {
  const {
    selectedDate,
    plantId,
    showCompleted = false,
    enablePrefetching = true,
    enableCaching = true,
    cacheSize = CACHE_SIZE,
    focusWindowSize = 5,
  } = options;

  const { t } = useTranslation();
  
  // State management
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefetching, setPrefetching] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  
  // Cache management
  const cacheRef = useRef<TaskCache>({});
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchingRef = useRef<Set<string>>(new Set());

  // Compute focus window (stable references)
  const focusWindow = useMemo(() => {
    const startDate = startOfDay(selectedDate);
    const halfWindow = Math.floor(focusWindowSize / 2);
    const focusStartDate = addDays(startDate, -halfWindow);
    const focusEndDate = addDays(startDate, halfWindow);
    
    const dateRange = [];
    for (let i = 0; i < focusWindowSize; i++) {
      dateRange.push(addDays(focusStartDate, i));
    }
    
    return {
      focusStartDate,
      focusEndDate,
      focusDateRange: dateRange,
    };
  }, [selectedDate, focusWindowSize]);

  // Create stable plant lookup map
  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((plant) => map.set(plant.id, plant));
    return map;
  }, [plants]);

  // Background task processing with stable reference
  const processTasksInBackground = useCallback((rawTasks: PlantTask[]): Promise<PlantTask[]> => {
    return new Promise((resolve) => {
      // Use setTimeout to avoid blocking UI thread
      setTimeout(() => {
        try {
          // Sort by priority and due date
          const sortedTasks = rawTasks.sort((a, b) => {
            // Priority order: critical > high > medium > low
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
            
            if (aPriority !== bPriority) {
              return bPriority - aPriority; // Higher priority first
            }
            
            // Then by due date
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });
          
          resolve(sortedTasks);
        } catch (error) {
          Logger.error('[useOptimizedTaskData] Error processing tasks in background', { error });
          resolve(rawTasks); // Fallback to unsorted
        }
      }, BACKGROUND_PROCESSING_DELAY);
    });
  }, []);

  // Cache management functions
  const getCacheKey = useCallback((date: Date, plantId?: string, showCompleted?: boolean) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return `${dateKey}-${plantId || 'all'}-${showCompleted ? 'completed' : 'active'}`;
  }, []);

  const getCachedTasks = useCallback((cacheKey: string): PlantTask[] | null => {
    if (!enableCaching) return null;
    
    const entry = cacheRef.current[cacheKey];
    if (!entry || entry.isLoading) return null;
    
    // Check if cache is still valid (5 minutes)
    const now = Date.now();
    if (now - entry.timestamp > 5 * 60 * 1000) {
      delete cacheRef.current[cacheKey];
      return null;
    }
    
    // Update last accessed time
    entry.lastAccessed = now;
    cacheStatsRef.current.hits++;
    
    return entry.tasks;
  }, [enableCaching]);

  const setCachedTasks = useCallback((cacheKey: string, tasks: PlantTask[]) => {
    if (!enableCaching) return;
    
    const now = Date.now();
    cacheRef.current[cacheKey] = {
      tasks,
      timestamp: now,
      lastAccessed: now,
      isLoading: false,
    };
    
    // Cleanup old entries if cache is too large
    const entries = Object.entries(cacheRef.current);
    if (entries.length > cacheSize) {
      // Sort by last accessed time and remove oldest
      entries
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
        .slice(0, entries.length - cacheSize)
        .forEach(([key]) => delete cacheRef.current[key]);
    }
  }, [enableCaching, cacheSize]);

  // Load tasks for a specific date with caching
  const loadTasksForDate = useCallback(async (
    date: Date,
    plantId?: string,
    showCompleted?: boolean
  ): Promise<PlantTask[]> => {
    const cacheKey = getCacheKey(date, plantId, showCompleted);
    
    // Check cache first
    const cachedTasks = getCachedTasks(cacheKey);
    if (cachedTasks) {
      return cachedTasks;
    }
    
    // Prevent duplicate loading
    if (prefetchingRef.current.has(cacheKey)) {
      return [];
    }
    
    prefetchingRef.current.add(cacheKey);
    cacheStatsRef.current.misses++;
    
    try {
      // Mark as loading in cache
      if (enableCaching) {
        cacheRef.current[cacheKey] = {
          tasks: [],
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          isLoading: true,
        };
      }
      
      const startOfDate = startOfDay(date);
      const endOfDate = addDays(startOfDate, 1);
      
      const taskQuery = database.collections
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('is_deleted', false),
          showCompleted ? Q.where('is_completed', true) : Q.where('is_completed', false),
          Q.where('due_date', Q.between(startOfDate.getTime(), endOfDate.getTime())),
          ...(plantId ? [Q.where('plant_id', plantId)] : [])
        );

      const rawTasks = await taskQuery.fetch();
      const processedTasks = await processTasksInBackground(rawTasks);
      
      // Cache the results
      setCachedTasks(cacheKey, processedTasks);
      
      return processedTasks;
    } catch (error) {
      Logger.error('[useOptimizedTaskData] Error loading tasks for date', { 
        date: date.toISOString(), 
        error 
      });
      
      // Remove loading state from cache
      if (enableCaching && cacheRef.current[cacheKey]) {
        delete cacheRef.current[cacheKey];
      }
      
      return [];
    } finally {
      prefetchingRef.current.delete(cacheKey);
    }
  }, [getCacheKey, getCachedTasks, setCachedTasks, processTasksInBackground, enableCaching]);

  // Load tasks for focus window
  const loadFocusWindowTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const taskPromises = focusWindow.focusDateRange.map(date =>
        loadTasksForDate(date, plantId, showCompleted)
      );
      
      const taskArrays = await Promise.all(taskPromises);
      const allTasks = taskArrays.flat();
      
      // Process tasks in background to avoid blocking UI
      const processedTasks = await processTasksInBackground(allTasks);
      setTasks(processedTasks);
      
    } catch (error) {
      Logger.error('[useOptimizedTaskData] Error loading focus window tasks', { error });
      Alert.alert(
        t('taskReminders.error'),
        t('taskReminders.errorLoadingTasks')
      );
    } finally {
      setLoading(false);
    }
  }, [focusWindow.focusDateRange, loadTasksForDate, plantId, showCompleted, processTasksInBackground, t]);

  // Intelligent prefetching for adjacent days
  const prefetchAdjacentDays = useCallback(async (
    direction: 'forward' | 'backward' | 'both' = 'both'
  ) => {
    if (!enablePrefetching) return;
    
    try {
      setPrefetching(true);
      
      const prefetchPromises: Promise<PlantTask[]>[] = [];
      
      if (direction === 'forward' || direction === 'both') {
        // Prefetch next 2 days after focus window
        for (let i = 1; i <= 2; i++) {
          const futureDate = addDays(focusWindow.focusEndDate, i);
          prefetchPromises.push(loadTasksForDate(futureDate, plantId, showCompleted));
        }
      }
      
      if (direction === 'backward' || direction === 'both') {
        // Prefetch previous 2 days before focus window
        for (let i = 1; i <= 2; i++) {
          const pastDate = addDays(focusWindow.focusStartDate, -i);
          prefetchPromises.push(loadTasksForDate(pastDate, plantId, showCompleted));
        }
      }
      
      await Promise.all(prefetchPromises);
      
    } catch (error) {
      Logger.error('[useOptimizedTaskData] Error prefetching adjacent days', { error });
    } finally {
      setPrefetching(false);
    }
  }, [enablePrefetching, focusWindow, loadTasksForDate, plantId, showCompleted]);

  // Group tasks by date with stable reference
  const tasksByDate = useMemo(() => {
    const groups = new Map<string, PlantTask[]>();
    
    // Initialize all focus window dates
    focusWindow.focusDateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      groups.set(dateKey, []);
    });

    // Group tasks by date
    tasks.forEach((task) => {
      try {
        const taskDate = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (groups.has(taskDate)) {
          groups.get(taskDate)!.push(task);
        }
      } catch (error) {
        Logger.warn('[useOptimizedTaskData] Invalid task due date', { 
          taskId: task.id, 
          dueDate: task.dueDate 
        });
      }
    });

    return groups;
  }, [tasks, focusWindow.focusDateRange]);

  // Cache statistics with stable reference
  const cacheStats = useMemo(() => {
    const totalRequests = cacheStatsRef.current.hits + cacheStatsRef.current.misses;
    const hitRate = totalRequests > 0 ? cacheStatsRef.current.hits / totalRequests : 0;
    const totalEntries = Object.keys(cacheRef.current).length;
    
    // Estimate memory usage (rough calculation)
    const memoryUsage = totalEntries * 50; // ~50KB per cache entry estimate
    
    return {
      hitRate,
      totalEntries,
      memoryUsage,
    };
  }, [retryKey]); // Update when data refreshes

  // Load plants (less frequent, can be cached longer)
  useEffect(() => {
    let plantsSubscription: any;

    const loadPlants = async () => {
      try {
        const plantsQuery = database.collections
          .get<Plant>('plants')
          .query(Q.where('is_deleted', false));

        plantsSubscription = plantsQuery.observe().subscribe({
          next: setPlants,
          error: (error) => {
            Logger.error('[useOptimizedTaskData] Error in plants subscription', { error });
            Alert.alert(
              t('taskReminders.error'),
              t('taskReminders.errorLoadingPlants')
            );
          }
        });
      } catch (error) {
        Logger.error('[useOptimizedTaskData] Error loading plants', { error });
      }
    };

    loadPlants();

    return () => {
      try {
        plantsSubscription?.unsubscribe();
      } catch (cleanupError) {
        Logger.error('[useOptimizedTaskData] Error during plants cleanup', { error: cleanupError });
      }
    };
  }, [t]);

  // Load focus window tasks when dependencies change
  useEffect(() => {
    loadFocusWindowTasks();
  }, [loadFocusWindowTasks, retryKey]);

  // Automatic prefetching when focus window changes
  useEffect(() => {
    if (enablePrefetching && !loading) {
      // Small delay to avoid interfering with main loading
      const timer = setTimeout(() => {
        prefetchAdjacentDays('both');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [enablePrefetching, loading, prefetchAdjacentDays]);

  // Cache cleanup timer
  useEffect(() => {
    if (enableCaching) {
      cleanupTimerRef.current = setInterval(() => {
        const now = Date.now();
        const entries = Object.entries(cacheRef.current);
        
        entries.forEach(([key, entry]) => {
          // Remove entries older than 10 minutes
          if (now - entry.lastAccessed > 10 * 60 * 1000) {
            delete cacheRef.current[key];
          }
        });
      }, CACHE_CLEANUP_INTERVAL);
      
      return () => {
        if (cleanupTimerRef.current) {
          clearInterval(cleanupTimerRef.current);
        }
      };
    }
  }, [enableCaching]);

  // Stable action functions
  const triggerRefresh = useCallback(() => {
    setRetryKey(prev => prev + 1);
    setTasks([]);
    
    // Clear cache on manual refresh
    if (enableCaching) {
      cacheRef.current = {};
      cacheStatsRef.current = { hits: 0, misses: 0 };
    }
  }, [enableCaching]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    cacheStatsRef.current = { hits: 0, misses: 0 };
    prefetchingRef.current.clear();
  }, []);

  return {
    // Core data
    tasks,
    plants,
    plantMap,
    tasksByDate,
    
    // Focus window
    focusStartDate: focusWindow.focusStartDate,
    focusEndDate: focusWindow.focusEndDate,
    focusDateRange: focusWindow.focusDateRange,
    
    // Performance metrics
    cacheStats,
    
    // Loading states
    loading,
    prefetching,
    
    // Actions
    triggerRefresh,
    clearCache,
    prefetchAdjacentDays,
  };
}

/**
 * Simplified hook for basic optimized task data
 */
export function useSimpleOptimizedTaskData(selectedDate: Date, plantId?: string) {
  return useOptimizedTaskData({
    selectedDate,
    plantId,
    showCompleted: false,
    enablePrefetching: true,
    enableCaching: true,
  });
}