import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TaskNavigation from './TaskNavigation';

// Mock dependencies
jest.mock('@/lib/utils/haptics', () => ({
  triggerLightHapticSync: jest.fn(),
  triggerMediumHaptic: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

describe('TaskNavigation', () => {
  const mockOnDateSelect = jest.fn();
  const mockOnTodayPress = jest.fn();
  const testDate = new Date('2025-01-24');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with required props', () => {
    const { getByText, getByLabelText } = render(
      <TaskNavigation
        selectedDate={testDate}
        onDateSelect={mockOnDateSelect}
      />
    );

    expect(getByText('Today')).toBeTruthy();
    expect(getByLabelText('Go to today')).toBeTruthy();
    expect(getByLabelText('Open date picker')).toBeTruthy();
  });

  it('calls onDateSelect when today button is pressed', () => {
    const { getByLabelText } = render(
      <TaskNavigation
        selectedDate={testDate}
        onDateSelect={mockOnDateSelect}
        onTodayPress={mockOnTodayPress}
      />
    );

    fireEvent.press(getByLabelText('Go to today'));
    
    expect(mockOnDateSelect).toHaveBeenCalled();
    expect(mockOnTodayPress).toHaveBeenCalled();
  });

  it('displays formatted date correctly', () => {
    const { getByText } = render(
      <TaskNavigation
        selectedDate={testDate}
        onDateSelect={mockOnDateSelect}
      />
    );

    // Should display formatted date (format may vary based on locale)
    expect(getByText(/Jan.*24.*2025/)).toBeTruthy();
  });

  it('has proper accessibility labels', () => {
    const { getByLabelText } = render(
      <TaskNavigation
        selectedDate={testDate}
        onDateSelect={mockOnDateSelect}
      />
    );

    expect(getByLabelText('Go to today')).toBeTruthy();
    expect(getByLabelText('Open date picker')).toBeTruthy();
  });
});