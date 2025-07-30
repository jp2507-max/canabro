/**
 * useTaskAnalytics Hook
 * 
 * React hook for task completion analytics and pattern recognition.
 * Provides task completion rates, patterns, and optimization suggestions.
 */

import { Q } from '@nozbe/watermelondb';
import { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';

import { PlantTask } from '@/lib/models/PlantTask';
import { TaskType } from '@/lib/types/taskTypes';
import useWatermelon from './useWatermelon';
import { Logger } from '@/lib/utils/production-utils';

export interface TaskCompletionRate {
  taskType: TaskType;
  totalTasks: number;
  completedTasks: number;
  completionRate: number; // 0-100
  averageCompletionTime: number; // hours from due date
  overdueCount: number;
}

export interface TaskPattern {
  taskType: TaskType;
  bestCompletionDay: string; // day of week
  bestCompletionHour: number; // 0-23
  averageDuration: number; // minutes
  consistencyScore: number; // 0-100
}

export interface TaskTrend {
  date: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  averageDelay: number; // hours
}

export interface OptimizationSuggestion {
  type: 'scheduling' | 'priority' | 'duration' | 'frequency';
  taskType?: TaskType;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
}

interface UseTaskAnalyticsOptions {
  plantId?: string;
  startDate?: Date;
  endDate?: Date;
  taskTypes?: TaskType[];
  fetchOnMount?: boolean;
}

export interface TaskAnalyticsData {
  completionRates: TaskCompletionRate[];
  patterns: TaskPattern[];
  trends: TaskTrend[];
  suggestions: OptimizationSuggestion[];
  overallStats: {
    totalTasks: number;
    completedTasks: number;
    overallCompletionRate: number;
    averageTasksPerDay: number;
    mostProductiveDay: string;
    leastProductiveDay: string;
  };
}

export function useTaskAnalytics(options: UseTaskAnalyticsOptions = {}) {
  const { plantTasks } = useWatermelon();
  const [data, setData] = useState<TaskAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query conditions
      const conditions = [];

      if (options.plantId) {
        conditions.push(Q.where('plant_id', options.plantId));
      }

      if (options.startDate) {
        conditions.push(Q.where('due_date', Q.gte(options.startDate.toISOString())));
      }

      if (options.endDate) {
        conditions.push(Q.where('due_date', Q.lte(options.endDate.toISOString())));
      }

      if (options.taskTypes && options.taskTypes.length > 0) {
        conditions.push(Q.where('task_type', Q.oneOf(options.taskTypes)));
      }

      // Fetch tasks
      const tasks = await plantTasks.query(...conditions).fetch();

      // Process analytics data
      const analyticsData = await processTaskAnalytics(tasks);
      setData(analyticsData);

      Logger.info('[useTaskAnalytics] Analytics data processed', {
        taskCount: tasks.length,
        plantId: options.plantId,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch task analytics');
      setError(error);
      Logger.error('[useTaskAnalytics] Error fetching analytics', { error });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount if specified
  useEffect(() => {
    if (options.fetchOnMount !== false) {
      fetchAnalytics();
    }
  }, [
    options.plantId,
    options.startDate,
    options.endDate,
    options.taskTypes,
    options.fetchOnMount,
  ]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

/**
 * Process raw task data into analytics insights
 */
async function processTaskAnalytics(tasks: PlantTask[]): Promise<TaskAnalyticsData> {
  const completionRates = calculateCompletionRates(tasks);
  const patterns = await calculateTaskPatterns(tasks);
  const trends = calculateTaskTrends(tasks);
  const suggestions = generateOptimizationSuggestions(tasks, completionRates, patterns);
  const overallStats = calculateOverallStats(tasks);

  return {
    completionRates,
    patterns,
    trends,
    suggestions,
    overallStats,
  };
}

/**
 * Calculate completion rates by task type
 */
function calculateCompletionRates(tasks: PlantTask[]): TaskCompletionRate[] {
  const taskTypeGroups = tasks.reduce((groups, task) => {
    if (!groups[task.taskType]) {
      groups[task.taskType] = [];
    }
    groups[task.taskType].push(task);
    return groups;
  }, {} as Record<TaskType, PlantTask[]>);

  return Object.entries(taskTypeGroups).map(([taskType, typeTasks]) => {
    const completedTasks = typeTasks.filter(task => task.isCompleted);
    const overdueTasks = typeTasks.filter(task => task.isOverdue);
    
    // Calculate average completion time (hours from due date)
    const completionTimes = completedTasks
      .filter(task => task.completionData?.completedAt)
      .map(task => {
        const dueDate = new Date(task.dueDate);
        const completedAt = task.completionData!.completedAt;
        return (completedAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60); // hours
      });

    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    return {
      taskType: taskType as TaskType,
      totalTasks: typeTasks.length,
      completedTasks: completedTasks.length,
      completionRate: typeTasks.length > 0 ? (completedTasks.length / typeTasks.length) * 100 : 0,
      averageCompletionTime,
      overdueCount: overdueTasks.length,
    };
  });
}

/**
 * Calculate task completion patterns
 */
async function calculateTaskPatterns(tasks: PlantTask[]): Promise<TaskPattern[]> {
  const completedTasks = tasks.filter(task => task.isCompleted && task.completionData?.completedAt);
  
  const taskTypeGroups = completedTasks.reduce((groups, task) => {
    if (!groups[task.taskType]) {
      groups[task.taskType] = [];
    }
    groups[task.taskType].push(task);
    return groups;
  }, {} as Record<TaskType, PlantTask[]>);

  return Object.entries(taskTypeGroups).map(([taskType, typeTasks]) => {
    // Analyze completion days and hours
    const completionData = typeTasks.map(task => {
      const completedAt = task.completionData!.completedAt;
      return {
        dayOfWeek: dayjs(completedAt).format('dddd'),
        hour: dayjs(completedAt).hour(),
        duration: task.estimatedDuration || 0,
      };
    });

    // Find most common completion day
    const dayFrequency = completionData.reduce((freq, data) => {
      freq[data.dayOfWeek] = (freq[data.dayOfWeek] || 0) + 1;
      return freq;
    }, {} as Record<string, number>);

    const bestCompletionDay = Object.entries(dayFrequency)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Monday';

    // Find most common completion hour
    const hourFrequency = completionData.reduce((freq, data) => {
      freq[data.hour] = (freq[data.hour] || 0) + 1;
      return freq;
    }, {} as Record<number, number>);

    const bestCompletionHour = parseInt(
      Object.entries(hourFrequency)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '9'
    );

    // Calculate average duration
    const averageDuration = completionData.length > 0
      ? completionData.reduce((sum, data) => sum + data.duration, 0) / completionData.length
      : 0;

    // Calculate consistency score (how often tasks are completed on the best day/hour)
    const bestDayCount = dayFrequency[bestCompletionDay] || 0;
    const bestHourCount = hourFrequency[bestCompletionHour] || 0;
    const consistencyScore = completionData.length > 0
      ? ((bestDayCount + bestHourCount) / (completionData.length * 2)) * 100
      : 0;

    return {
      taskType: taskType as TaskType,
      bestCompletionDay,
      bestCompletionHour,
      averageDuration,
      consistencyScore,
    };
  });
}

/**
 * Calculate task completion trends over time
 */
function calculateTaskTrends(tasks: PlantTask[]): TaskTrend[] {
  // Group tasks by date
  const dateGroups = tasks.reduce((groups, task) => {
    const date = dayjs(task.dueDate).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(task);
    return groups;
  }, {} as Record<string, PlantTask[]>);

  return Object.entries(dateGroups)
    .map(([date, dateTasks]) => {
      const completedTasks = dateTasks.filter(task => task.isCompleted);
      const completionRate = dateTasks.length > 0 ? (completedTasks.length / dateTasks.length) * 100 : 0;
      
      // Calculate average delay (hours from due date to completion)
      const delays = completedTasks
        .filter(task => task.completionData?.completedAt)
        .map(task => {
          const dueDate = new Date(task.dueDate);
          const completedAt = task.completionData!.completedAt;
          return (completedAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60); // hours
        });

      const averageDelay = delays.length > 0
        ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length
        : 0;

      return {
        date,
        completedTasks: completedTasks.length,
        totalTasks: dateTasks.length,
        completionRate,
        averageDelay,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate optimization suggestions based on analytics
 */
function generateOptimizationSuggestions(
  tasks: PlantTask[],
  completionRates: TaskCompletionRate[],
  patterns: TaskPattern[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Low completion rate suggestions
  completionRates.forEach(rate => {
    if (rate.completionRate < 70 && rate.totalTasks >= 5) {
      suggestions.push({
        type: 'priority',
        taskType: rate.taskType,
        title: `Improve ${rate.taskType} completion rate`,
        description: `Your ${rate.taskType} completion rate is ${rate.completionRate.toFixed(1)}%. Consider setting reminders or adjusting the schedule.`,
        impact: rate.completionRate < 50 ? 'high' : 'medium',
        actionable: true,
      });
    }
  });

  // Overdue task suggestions
  completionRates.forEach(rate => {
    if (rate.overdueCount > 0) {
      suggestions.push({
        type: 'scheduling',
        taskType: rate.taskType,
        title: `Reduce overdue ${rate.taskType} tasks`,
        description: `You have ${rate.overdueCount} overdue ${rate.taskType} tasks. Consider rescheduling or adjusting frequency.`,
        impact: rate.overdueCount > 3 ? 'high' : 'medium',
        actionable: true,
      });
    }
  });

  // Pattern-based suggestions
  patterns.forEach(pattern => {
    if (pattern.consistencyScore < 50) {
      suggestions.push({
        type: 'scheduling',
        taskType: pattern.taskType,
        title: `Optimize ${pattern.taskType} timing`,
        description: `You complete ${pattern.taskType} tasks most often on ${pattern.bestCompletionDay} at ${pattern.bestCompletionHour}:00. Consider scheduling more tasks at this time.`,
        impact: 'medium',
        actionable: true,
      });
    }
  });

  // Duration optimization suggestions
  patterns.forEach(pattern => {
    if (pattern.averageDuration > 60) { // More than 1 hour
      suggestions.push({
        type: 'duration',
        taskType: pattern.taskType,
        title: `Break down ${pattern.taskType} tasks`,
        description: `Your ${pattern.taskType} tasks take an average of ${Math.round(pattern.averageDuration)} minutes. Consider breaking them into smaller tasks.`,
        impact: 'low',
        actionable: true,
      });
    }
  });

  // General productivity suggestions
  if (tasks.length > 20) {
    const overallCompletionRate = (tasks.filter(t => t.isCompleted).length / tasks.length) * 100;
    
    if (overallCompletionRate > 85) {
      suggestions.push({
        type: 'frequency',
        title: 'Excellent task management!',
        description: `You have a ${overallCompletionRate.toFixed(1)}% completion rate. Consider taking on more challenging growing techniques.`,
        impact: 'low',
        actionable: false,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
}

/**
 * Calculate overall statistics
 */
function calculateOverallStats(tasks: PlantTask[]) {
  const completedTasks = tasks.filter(task => task.isCompleted);
  const overallCompletionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  // Calculate tasks per day
  const dateRange = tasks.length > 0 ? {
    start: dayjs(Math.min(...tasks.map(t => new Date(t.dueDate).getTime()))),
    end: dayjs(Math.max(...tasks.map(t => new Date(t.dueDate).getTime()))),
  } : null;

  const dayCount = dateRange ? dateRange.end.diff(dateRange.start, 'day') + 1 : 1;
  const averageTasksPerDay = tasks.length / dayCount;

  // Find most/least productive days
  const dayCompletions = completedTasks.reduce((days, task) => {
    // Only process tasks with valid completion dates
    if (task.completionData?.completedAt) {
      const day = dayjs(task.completionData.completedAt).format('dddd');
      days[day] = (days[day] || 0) + 1;
    }
    return days;
  }, {} as Record<string, number>);

  const sortedDays = Object.entries(dayCompletions).sort(([, a], [, b]) => b - a);
  const mostProductiveDay = sortedDays[0]?.[0] || 'Monday';
  const leastProductiveDay = sortedDays[sortedDays.length - 1]?.[0] || 'Sunday';

  return {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    overallCompletionRate,
    averageTasksPerDay,
    mostProductiveDay,
    leastProductiveDay,
  };
}