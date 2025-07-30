/**
 * TaskCompletionForm Tests
 * 
 * Tests for the adapted MetricsInputForm for task completion tracking
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TaskCompletionForm } from './TaskCompletionForm';
import { TaskCompletion } from '@/lib/models/PlantTask';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/utils/image-picker', () => ({
  takePhoto: jest.fn(),
  selectFromGallery: jest.fn(),
}));

jest.mock('@/lib/utils/haptics', () => ({
  triggerLightHaptic: jest.fn(),
  triggerMediumHaptic: jest.fn(),
  triggerSelectionHaptic: jest.fn(),
}));

jest.mock('@/lib/models/PlantMetrics', () => ({
  PlantMetrics: {
    calculateVPD: jest.fn(() => 1.2),
  },
}));

describe('TaskCompletionForm', () => {
  const mockProps = {
    taskId: 'test-task-id',
    taskTitle: 'Water Plant',
    taskType: 'watering',
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with task information', () => {
    const { getByText } = render(<TaskCompletionForm {...mockProps} />);
    
    expect(getByText('taskCompletion.title')).toBeTruthy();
    expect(getByText('Water Plant')).toBeTruthy();
    expect(getByText('watering')).toBeTruthy();
  });

  it('shows mode selector with quick and comprehensive options', () => {
    const { getByText } = render(<TaskCompletionForm {...mockProps} />);
    
    expect(getByText('taskCompletion.quickMode.title')).toBeTruthy();
    expect(getByText('taskCompletion.comprehensiveMode.title')).toBeTruthy();
  });

  it('switches between quick and comprehensive modes', () => {
    const { getByText, queryByText } = render(<TaskCompletionForm {...mockProps} />);
    
    // Initially in quick mode
    expect(queryByText('taskCompletion.sections.environmental')).toBeFalsy();
    
    // Switch to comprehensive mode
    fireEvent.press(getByText('taskCompletion.comprehensiveMode.title'));
    
    expect(getByText('taskCompletion.sections.environmental')).toBeTruthy();
    expect(getByText('taskCompletion.sections.supplies')).toBeTruthy();
    expect(getByText('taskCompletion.sections.photos')).toBeTruthy();
  });

  it('submits quick completion with notes only', async () => {
    const { getByText, getByPlaceholderText } = render(<TaskCompletionForm {...mockProps} />);
    
    // Add notes
    const notesInput = getByPlaceholderText('taskCompletion.fields.notesPlaceholder');
    fireEvent.changeText(notesInput, 'Task completed successfully');
    
    // Submit
    fireEvent.press(getByText('taskCompletion.buttons.complete'));
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'test-task-id',
          notes: 'Task completed successfully',
          completedAt: expect.any(Date),
        })
      );
    });
  });

  it('submits comprehensive completion with all data', async () => {
    const { getByText, getByPlaceholderText } = render(<TaskCompletionForm {...mockProps} />);
    
    // Switch to comprehensive mode
    fireEvent.press(getByText('taskCompletion.comprehensiveMode.title'));
    
    // Fill in comprehensive data
    const notesInput = getByPlaceholderText('taskCompletion.fields.notesPlaceholder');
    fireEvent.changeText(notesInput, 'Comprehensive completion');
    
    const durationInput = getByPlaceholderText('taskCompletion.fields.durationPlaceholder');
    fireEvent.changeText(durationInput, '15');
    
    const tempInput = getByPlaceholderText('°C');
    fireEvent.changeText(tempInput, '24');
    
    const humidityInput = getByPlaceholderText('0-100%');
    fireEvent.changeText(humidityInput, '65');
    
    // Submit
    fireEvent.press(getByText('taskCompletion.buttons.complete'));
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'test-task-id',
          notes: 'Comprehensive completion',
          completedAt: expect.any(Date),
          conditions: {
            temperature: 24,
            humidity: 65,
            pH: undefined,
          },
          supplies: {
            used: [],
            amounts: {},
          },
        })
      );
    });
  });

  it('handles cancel action', () => {
    const { getByText } = render(<TaskCompletionForm {...mockProps} />);
    
    fireEvent.press(getByText('taskCompletion.buttons.cancel'));
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('validates form inputs correctly', async () => {
    const { getByText, getByPlaceholderText } = render(<TaskCompletionForm {...mockProps} />);
    
    // Switch to comprehensive mode
    fireEvent.press(getByText('taskCompletion.comprehensiveMode.title'));
    
    // Enter invalid humidity
    const humidityInput = getByPlaceholderText('0-100%');
    fireEvent.changeText(humidityInput, '150');
    
    // Submit should show validation error
    fireEvent.press(getByText('taskCompletion.buttons.complete'));
    
    await waitFor(() => {
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  it('calculates and displays VPD when temperature and humidity are provided', () => {
    const { getByText, getByPlaceholderText } = render(<TaskCompletionForm {...mockProps} />);
    
    // Switch to comprehensive mode
    fireEvent.press(getByText('taskCompletion.comprehensiveMode.title'));
    
    // Enter temperature and humidity
    const tempInput = getByPlaceholderText('°C');
    fireEvent.changeText(tempInput, '24');
    
    const humidityInput = getByPlaceholderText('0-100%');
    fireEvent.changeText(humidityInput, '65');
    
    // VPD should be calculated and displayed
    expect(getByText(/taskCompletion.fields.vpd.*1.2 kPa/)).toBeTruthy();
  });
});