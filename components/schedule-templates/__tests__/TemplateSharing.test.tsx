import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { TemplateSharing } from '../TemplateSharing';
import { ScheduleTemplate } from '../../../lib/models/ScheduleTemplate';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key}_${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

jest.mock('../../../lib/hooks/useDatabase', () => ({
  useDatabase: () => ({
    database: {
      write: jest.fn(),
      get: jest.fn(() => ({
        create: jest.fn(),
      })),
    },
  }),
}));

jest.mock('../../../lib/utils/haptics', () => ({
  triggerLightHaptic: jest.fn(),
  triggerMediumHaptic: jest.fn(),
  triggerHeavyHaptic: jest.fn(),
}));

jest.mock('../../../lib/utils/uuid', () => ({
  generateUuid: () => 'test-uuid',
}));

jest.mock('../../../lib/utils/date', () => ({
  format: () => '2024-01-01',
}));

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Share: {
      share: jest.fn(),
    },
  };
});

// Mock template data
const mockTemplate = {
  id: 'test-template-id',
  name: 'Test Template',
  description: 'Test description',
  category: 'indoor',
  strainType: 'hybrid',
  durationWeeks: 8,
  createdBy: 'test-user',
  isPublic: false,
  usageCount: 5,
  totalTasks: 10,
  templateData: [
    {
      weekNumber: 1,
      dayOfWeek: 1,
      taskType: 'watering',
      title: 'Water plants',
      description: 'Water all plants thoroughly',
      priority: 'medium' as const,
      estimatedDuration: 30,
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  togglePublic: jest.fn(),
  incrementUsageCount: jest.fn(),
  updateTemplateData: jest.fn(),
} as unknown as ScheduleTemplate;

describe('TemplateSharing', () => {
  const defaultProps = {
    template: mockTemplate,
    onClose: jest.fn(),
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(<TemplateSharing {...defaultProps} />);
    
    expect(getByText('templates.sharing.shareTemplate')).toBeTruthy();
    expect(getByText('Test Template')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <TemplateSharing {...defaultProps} visible={false} />
    );
    
    expect(queryByText('templates.sharing.shareTemplate')).toBeNull();
  });

  it('switches between share and versions tabs', () => {
    const { getByText } = render(<TemplateSharing {...defaultProps} />);
    
    // Should start on share tab
    expect(getByText('templates.sharing.shareLink')).toBeTruthy();
    
    // Switch to versions tab
    fireEvent.press(getByText('templates.sharing.versions'));
    expect(getByText('templates.sharing.versionHistory')).toBeTruthy();
  });

  it('handles template export', async () => {
    const mockShare = Share.share as jest.Mock;
    mockShare.mockResolvedValue({});

    const { getByText } = render(<TemplateSharing {...defaultProps} />);
    
    fireEvent.press(getByText('templates.sharing.exportTemplate'));
    
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining('Test Template'),
        title: 'Test Template - Schedule Template',
      });
    });
  });

  it('handles template sharing link', async () => {
    const mockShare = Share.share as jest.Mock;
    mockShare.mockResolvedValue({});

    const { getByText } = render(<TemplateSharing {...defaultProps} />);
    
    fireEvent.press(getByText('templates.sharing.shareLink'));
    
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining('Test Template'),
        title: 'Test Template',
        url: expect.stringContaining('canabro.app/templates'),
      });
    });
  });

  it('handles template import', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TemplateSharing {...defaultProps} />
    );
    
    // Open import modal
    fireEvent.press(getByText('templates.sharing.importTemplate'));
    
    // Enter import data
    const importInput = getByPlaceholderText('templates.sharing.pasteHere');
    const validTemplateData = JSON.stringify({
      version: '1.0',
      template: {
        name: 'Imported Template',
        description: 'Test import',
        category: 'indoor',
        durationWeeks: 6,
        templateData: [
          {
            weekNumber: 1,
            dayOfWeek: 1,
            taskType: 'watering',
            title: 'Water',
            priority: 'medium',
            estimatedDuration: 15,
          },
        ],
      },
      metadata: {
        exportedAt: '2024-01-01T00:00:00.000Z',
        exportedBy: 'test-user',
        appVersion: '1.0.0',
      },
    });
    
    fireEvent.changeText(importInput, validTemplateData);
    fireEvent.press(getByText('templates.sharing.import'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'templates.sharing.importSuccess',
        'templates.sharing.importSuccessMessage',
        expect.any(Array)
      );
    });
  });

  it('handles invalid import data', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TemplateSharing {...defaultProps} />
    );
    
    // Open import modal
    fireEvent.press(getByText('templates.sharing.importTemplate'));
    
    // Enter invalid import data
    const importInput = getByPlaceholderText('templates.sharing.pasteHere');
    fireEvent.changeText(importInput, 'invalid json');
    fireEvent.press(getByText('templates.sharing.import'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'templates.sharing.importError',
        'templates.sharing.invalidImportData'
      );
    });
  });

  it('displays template information correctly', () => {
    const { getByText } = render(<TemplateSharing {...defaultProps} />);
    
    expect(getByText('indoor')).toBeTruthy();
    expect(getByText('8 templates.sharing.weeks')).toBeTruthy();
    expect(getByText('10')).toBeTruthy(); // totalTasks
    expect(getByText('5')).toBeTruthy(); // usageCount
  });

  it('handles close button', () => {
    const mockOnClose = jest.fn();
    const { getByRole } = render(
      <TemplateSharing {...defaultProps} onClose={mockOnClose} />
    );
    
    // Find and press close button (assuming it has proper accessibility role)
    const closeButtons = getByRole('button');
    fireEvent.press(closeButtons);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});