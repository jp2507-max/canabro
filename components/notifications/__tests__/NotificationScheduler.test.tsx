import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NotificationScheduler from '../NotificationScheduler';
import { Plant } from '@/lib/models/Plant';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/hooks/useNotifications', () => ({
  useNotifications: () => ({
    permissionStatus: 'granted',
    scheduleNotification: jest.fn().mockResolvedValue('notification-id'),
  }),
}));

jest.mock('@/lib/services/careReminderService', () => ({
  careReminderService: {
    createReminder: jest.fn().mockResolvedValue({
      id: 'reminder-id',
      title: 'Test Reminder',
      type: 'watering',
      scheduledFor: new Date(),
    }),
  },
}));

jest.mock('expo-calendar', () => ({
  getCalendarPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
  }),
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
  }),
  getCalendarsAsync: jest.fn().mockResolvedValue([
    { id: 'calendar-1', isPrimary: true },
  ]),
  createEventAsync: jest.fn().mockResolvedValue('event-id'),
  EntityTypes: { EVENT: 'event' },
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('@/lib/utils/haptics', () => ({
  triggerLightHapticSync: jest.fn(),
  triggerMediumHapticSync: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockPlant = {
  id: 'plant-1',
  name: 'Test Plant',
  strain: 'Test Strain',
  imageUrl: 'https://example.com/image.jpg',
} as Plant;

describe('NotificationScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with plant information', () => {
    const { getByText } = render(
      <NotificationScheduler
        plant={mockPlant}
        onReminderCreated={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('notificationScheduler.createReminder')).toBeTruthy();
    expect(getByText('Test Plant • Test Strain')).toBeTruthy();
  });

  it('displays reminder type options', () => {
    const { getByText } = render(
      <NotificationScheduler
        plant={mockPlant}
        onReminderCreated={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('notificationScheduler.types.watering')).toBeTruthy();
    expect(getByText('notificationScheduler.types.nutrients')).toBeTruthy();
    expect(getByText('notificationScheduler.types.inspection')).toBeTruthy();
    expect(getByText('notificationScheduler.types.custom')).toBeTruthy();
  });

  it('shows form fields for reminder creation', () => {
    const { getByText, getByDisplayValue } = render(
      <NotificationScheduler
        plant={mockPlant}
        onReminderCreated={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('notificationScheduler.title')).toBeTruthy();
    expect(getByText('notificationScheduler.description')).toBeTruthy();
    expect(getByText('notificationScheduler.scheduledFor')).toBeTruthy();
  });

  it('displays calendar integration option', () => {
    const { getByText } = render(
      <NotificationScheduler
        plant={mockPlant}
        onReminderCreated={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Add to Device Calendar')).toBeTruthy();
    expect(getByText('Create a calendar event for this reminder')).toBeTruthy();
  });

  it('shows repeat interval options', () => {
    const { getByText } = render(
      <NotificationScheduler
        plant={mockPlant}
        onReminderCreated={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Every 3 days')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
    expect(getByText('Bi-weekly')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
  });

  it('calls onClose when cancel button is pressed', () => {
    const onCloseMock = jest.fn();
    const { getByText } = render(
      <NotificationScheduler
        plant={mockPlant}
        onReminderCreated={jest.fn()}
        onClose={onCloseMock}
      />
    );

    fireEvent.press(getByText('common.cancel'));
    expect(onCloseMock).toHaveBeenCalled();
  });
});