/**
 * TaskAnalyticsChart Tests
 * 
 * Tests for the task analytics chart component
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TaskAnalyticsChart } from './TaskAnalyticsChart';

// Mock the hooks
jest.mock('@/lib/hooks/useTaskAnalytics', () => ({
  useTaskAnalytics: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Mock haptics
jest.mock('@/lib/utils/haptics', () => ({
  triggerLightHaptic: jest.fn(),
}));

// Mock chart library
jest.mock('react-native-gifted-charts', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
}));

describe('TaskAnalyticsChart', () => {
  it('renders loading state correctly', () => {
    const { useTaskAnalytics } = require('@/lib/hooks/useTaskAnalytics');
    useTaskAnalytics.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<TaskAnalyticsChart />);
    
    expect(screen.getByText('taskAnalytics.loading')).toBeTruthy();
  });

  it('renders error state correctly', () => {
    const { useTaskAnalytics } = require('@/lib/hooks/useTaskAnalytics');
    useTaskAnalytics.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Test error'),
      refetch: jest.fn(),
    });

    render(<TaskAnalyticsChart />);
    
    expect(screen.getByText('taskAnalytics.error')).toBeTruthy();
    expect(screen.getByText('taskAnalytics.retry')).toBeTruthy();
  });

  it('renders no data state correctly', () => {
    const { useTaskAnalytics } = require('@/lib/hooks/useTaskAnalytics');
    useTaskAnalytics.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TaskAnalyticsChart />);
    
    expect(screen.getByText('taskAnalytics.noData')).toBeTruthy();
    expect(screen.getByText('taskAnalytics.noDataDescription')).toBeTruthy();
  });

  it('renders chart with data correctly', () => {
    const mockData = {
      completionRates: [
        {
          taskType: 'watering' as const,
          totalTasks: 10,
          completedTasks: 8,
          completionRate: 80,
          averageCompletionTime: 2.5,
          overdueCount: 1,
        },
      ],
      patterns: [],
      trends: [],
      suggestions: [],
      overallStats: {
        totalTasks: 10,
        completedTasks: 8,
        overallCompletionRate: 80,
        averageTasksPerDay: 2.5,
        mostProductiveDay: 'Monday',
        leastProductiveDay: 'Sunday',
      },
    };

    const { useTaskAnalytics } = require('@/lib/hooks/useTaskAnalytics');
    useTaskAnalytics.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TaskAnalyticsChart />);
    
    expect(screen.getByText('taskAnalytics.title')).toBeTruthy();
    expect(screen.getByText('80.0%')).toBeTruthy();
  });

  it('renders suggestions when available', () => {
    const mockData = {
      completionRates: [],
      patterns: [],
      trends: [],
      suggestions: [
        {
          type: 'scheduling' as const,
          taskType: 'watering' as const,
          title: 'Test suggestion',
          description: 'Test description',
          impact: 'high' as const,
          actionable: true,
        },
      ],
      overallStats: {
        totalTasks: 10,
        completedTasks: 8,
        overallCompletionRate: 80,
        averageTasksPerDay: 2.5,
        mostProductiveDay: 'Monday',
        leastProductiveDay: 'Sunday',
      },
    };

    const { useTaskAnalytics } = require('@/lib/hooks/useTaskAnalytics');
    useTaskAnalytics.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TaskAnalyticsChart showSuggestions={true} />);
    
    expect(screen.getByText('taskAnalytics.suggestions.title')).toBeTruthy();
    expect(screen.getByText('Test suggestion')).toBeTruthy();
  });
});