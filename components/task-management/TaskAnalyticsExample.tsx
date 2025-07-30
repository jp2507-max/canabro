/**
 * TaskAnalyticsExample - Example usage of TaskAnalyticsChart
 * 
 * This component demonstrates how to integrate the TaskAnalyticsChart
 * into your application screens.
 */

import React, { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { TaskAnalyticsChart } from './TaskAnalyticsChart';
import { TaskType } from '@/lib/types/taskTypes';

interface TaskAnalyticsExampleProps {
  plantId?: string;
}

export const TaskAnalyticsExample: React.FC<TaskAnalyticsExampleProps> = ({
  plantId,
}) => {
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [chartType, setChartType] = useState<'completion' | 'trends' | 'patterns'>('completion');

  const taskTypes: TaskType[] = ['watering', 'feeding', 'inspection', 'pruning'];

  const handleTaskTypeToggle = (taskType: TaskType) => {
    setSelectedTaskTypes(prev => {
      const isSelected = prev.includes(taskType);
      if (isSelected) {
        return prev.filter(type => type !== taskType);
      } else {
        return [...prev, taskType];
      }
    });
  };

  return (
    <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ThemedView className="p-4">
        <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
          Task Analytics Dashboard
        </ThemedText>

        {/* Task Type Filters */}
        <ThemedView className="mb-4">
          <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Filter by Task Type
          </ThemedText>
          <ThemedView className="flex-row flex-wrap gap-2">
            {taskTypes.map((taskType) => (
              <TouchableOpacity
                key={taskType}
                onPress={() => handleTaskTypeToggle(taskType)}
                className={`px-3 py-2 rounded-lg border ${
                  selectedTaskTypes.includes(taskType)
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'
                }`}
              >
                <ThemedText
                  className={`text-sm font-medium ${
                    selectedTaskTypes.includes(taskType)
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {taskType.charAt(0).toUpperCase() + taskType.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Time Range Selector */}
        <ThemedView className="mb-4">
          <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Time Range
          </ThemedText>
          <ThemedView className="flex-row gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setTimeRange(range)}
                className={`px-3 py-2 rounded-lg ${
                  timeRange === range
                    ? 'bg-blue-500'
                    : 'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600'
                }`}
              >
                <ThemedText
                  className={`text-sm font-medium ${
                    timeRange === range
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Chart Type Selector */}
        <ThemedView className="mb-6">
          <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Chart Type
          </ThemedText>
          <ThemedView className="flex-row gap-2">
            {(['completion', 'trends', 'patterns'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setChartType(type)}
                className={`px-3 py-2 rounded-lg ${
                  chartType === type
                    ? 'bg-blue-500'
                    : 'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600'
                }`}
              >
                <ThemedText
                  className={`text-sm font-medium ${
                    chartType === type
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Analytics Chart */}
        <TaskAnalyticsChart
          plantId={plantId}
          taskTypes={selectedTaskTypes.length > 0 ? selectedTaskTypes : undefined}
          timeRange={timeRange}
          chartType={chartType}
          showSuggestions={true}
          className="mb-6"
        />

        {/* Usage Instructions */}
        <ThemedView className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <ThemedText className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to Use Task Analytics
          </ThemedText>
          <ThemedView className="space-y-2">
            <ThemedText className="text-sm text-blue-800 dark:text-blue-200">
              • <ThemedText className="font-medium">Completion Rates:</ThemedText> Shows how well you complete different types of tasks
            </ThemedText>
            <ThemedText className="text-sm text-blue-800 dark:text-blue-200">
              • <ThemedText className="font-medium">Trends:</ThemedText> Displays your task completion performance over time
            </ThemedText>
            <ThemedText className="text-sm text-blue-800 dark:text-blue-200">
              • <ThemedText className="font-medium">Patterns:</ThemedText> Reveals when you're most consistent with task completion
            </ThemedText>
            <ThemedText className="text-sm text-blue-800 dark:text-blue-200">
              • <ThemedText className="font-medium">Suggestions:</ThemedText> Get personalized recommendations to improve your plant care routine
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
};

export default TaskAnalyticsExample;