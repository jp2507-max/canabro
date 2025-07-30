/**
 * TaskAnalyticsChart Type Safety Tests
 * 
 * Tests for the type assertion risk fixes in task type handling
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TaskAnalyticsChart } from '../TaskAnalyticsChart';
import { TaskType } from '@/lib/types/taskTypes';

// Mock the analytics hook
jest.mock('@/lib/hooks/useTaskAnalytics', () => ({
  useTaskAnalytics: jest.fn(() => ({
    data: {
      overallStats: {
        overallCompletionRate: 85.5,
        completedTasks: 17,
        totalTasks: 20,
        averageTasksPerDay: 2.3,
      },
      completionRates: [
        {
          taskType: 'watering' as TaskType,
          completionRate: 95.0,
          completedTasks: 19,
          totalTasks: 20,
          overdueCount: 1,
          averageCompletionTime: 2.5,
        },
        {
          taskType: 'feeding' as TaskType,
          completionRate: 87.5,
          completedTasks: 7,
          totalTasks: 8,
          overdueCount: 1,
          averageCompletionTime: 4.2,
        },
      ],
      trends: [],
      patterns: [],
      suggestions: [],
    },
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock NativeWind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Mock chart components
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
  BarChart: () => null,
}));

// Mock haptics
jest.mock('@/lib/utils/haptics', () => ({
  triggerLightHaptic: jest.fn(),
}));

describe('TaskAnalyticsChart Type Safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without type assertion errors', () => {
    expect(() => {
      render(<TaskAnalyticsChart />);
    }).not.toThrow();
  });

  it('should handle valid task types in props', () => {
    const validTaskTypes: TaskType[] = ['watering', 'feeding', 'inspection'];
    
    expect(() => {
      render(<TaskAnalyticsChart taskTypes={validTaskTypes} />);
    }).not.toThrow();
  });

  it('should handle all valid task types', () => {
    const allValidTaskTypes: TaskType[] = [
      'watering',
      'feeding',
      'inspection',
      'pruning',
      'harvest',
      'transplant',
      'training',
      'defoliation',
      'flushing',
    ];
    
    expect(() => {
      render(<TaskAnalyticsChart taskTypes={allValidTaskTypes} />);
    }).not.toThrow();
  });

  it('should handle empty task types array', () => {
    expect(() => {
      render(<TaskAnalyticsChart taskTypes={[]} />);
    }).not.toThrow();
  });

  it('should render with different chart types', () => {
    const chartTypes = ['completion', 'trends', 'patterns'] as const;
    
    chartTypes.forEach(chartType => {
      expect(() => {
        render(<TaskAnalyticsChart chartType={chartType} />);
      }).not.toThrow();
    });
  });

  it('should render with different time ranges', () => {
    const timeRanges = ['7d', '30d', '90d', 'all'] as const;
    
    timeRanges.forEach(timeRange => {
      expect(() => {
        render(<TaskAnalyticsChart timeRange={timeRange} />);
      }).not.toThrow();
    });
  });

  it('should handle plant ID prop safely', () => {
    expect(() => {
      render(<TaskAnalyticsChart plantId="test-plant-123" />);
    }).not.toThrow();
  });

  it('should handle suggestions toggle safely', () => {
    expect(() => {
      render(<TaskAnalyticsChart showSuggestions={true} />);
    }).not.toThrow();
    
    expect(() => {
      render(<TaskAnalyticsChart showSuggestions={false} />);
    }).not.toThrow();
  });
});

describe('TaskAnalyticsChart Internal Functions Type Safety', () => {
  // Note: These would be integration tests if the internal functions were exported
  // For now, we're testing through the component behavior
  
  it('should not crash when processing chart data with valid task types', () => {
    // This tests the internal getTaskTypeColor and related functions indirectly
    expect(() => {
      render(<TaskAnalyticsChart />);
    }).not.toThrow();
  });
});
