/**
 * UserReporting System Tests
 * 
 * Tests for user reporting functionality including:
 * - UserReportModal component
 * - UserReportReview component  
 * - UserAppealModal component
 * - User reporting service
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import UserReportModal from '../UserReportModal';
import UserReportReview from '../UserReportReview';
import UserAppealModal from '../UserAppealModal';
import { userReportingService } from '../../../lib/services/user-reporting.service';

// Mock dependencies
jest.mock('../../../lib/utils/haptics', () => ({
  triggerLightHapticSync: jest.fn(),
  triggerMediumHapticSync: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'userReportModal.title': 'Report User',
        'userReportModal.categoryLabel': 'Report Category',
        'userReportModal.descriptionLabel': 'Description',
        'userReportModal.cancel': 'Cancel',
        'userReportModal.submit': 'Submit Report',
        'userReportReview.title': 'User Reports Review',
        'userAppealModal.title': 'Appeal Report',
      };
      return params ? translations[key]?.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key]) : translations[key] || key;
    },
  }),
}));

jest.mock('../../../lib/services/user-reporting.service');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('UserReportModal', () => {
  const mockReportedUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    reportedUser: mockReportedUser,
    submitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    render(<UserReportModal {...defaultProps} />);
    
    expect(screen.getByText('Report User')).toBeTruthy();
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('@testuser')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(<UserReportModal {...defaultProps} visible={false} />);
    
    expect(screen.queryByText('Report User')).toBeNull();
  });

  it('handles category selection', () => {
    render(<UserReportModal {...defaultProps} />);
    
    // The SegmentedControl should be present
    expect(screen.getByText('Report Category')).toBeTruthy();
  });

  it('validates form before submission', () => {
    render(<UserReportModal {...defaultProps} />);
    
    const submitButton = screen.getByText('Submit Report');
    fireEvent.press(submitButton);
    
    // Should not call onSubmit if form is invalid
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(<UserReportModal {...defaultProps} />);
    
    // Fill in description
    const descriptionInput = screen.getByPlaceholderText(/describe the issue/i);
    fireEvent.changeText(descriptionInput, 'This user is being inappropriate in discussions.');
    
    const submitButton = screen.getByText('Submit Report');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          reportedUserId: 'user-123',
          category: 'harassment',
          description: 'This user is being inappropriate in discussions.',
          isAnonymous: false,
        })
      );
    });
  });

  it('handles anonymous reporting toggle', () => {
    render(<UserReportModal {...defaultProps} />);
    
    const anonymousToggle = screen.getByText(/Submit anonymously/i);
    fireEvent.press(anonymousToggle);
    
    // Should toggle the anonymous state
    expect(screen.getByText(/Submit anonymously/i)).toBeTruthy();
  });

  it('shows loading state when submitting', () => {
    render(<UserReportModal {...defaultProps} submitting={true} />);
    
    expect(screen.getByText(/Submitting/i)).toBeTruthy();
  });
});

describe('UserReportReview', () => {
  const mockReports = [
    {
      id: 'report-1',
      reportedUser: {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        joinedAt: new Date('2023-01-01'),
        postsCount: 25,
        reportsCount: 1,
        lastActive: new Date(),
      },
      reporter: {
        id: 'reporter-1',
        username: 'reporter',
        displayName: 'Reporter User',
        avatar: 'https://example.com/reporter.jpg',
      },
      category: 'harassment' as const,
      severity: 'medium' as const,
      description: 'User was being inappropriate',
      status: 'pending' as const,
      createdAt: new Date(),
      isAnonymous: false,
    },
  ];

  const defaultProps = {
    reports: mockReports,
    onReportAction: jest.fn(),
    onUserAction: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reports list correctly', () => {
    render(<UserReportReview {...defaultProps} />);
    
    expect(screen.getByText('User Reports Review')).toBeTruthy();
    expect(screen.getByText('HARASSMENT')).toBeTruthy();
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows loading state', () => {
    render(<UserReportReview {...defaultProps} loading={true} />);
    
    expect(screen.getByText(/Loading reports/i)).toBeTruthy();
  });

  it('shows empty state when no reports', () => {
    render(<UserReportReview {...defaultProps} reports={[]} />);
    
    expect(screen.getByText(/No Reports Found/i)).toBeTruthy();
  });

  it('expands report details when tapped', () => {
    render(<UserReportReview {...defaultProps} />);
    
    const reportItem = screen.getByText('HARASSMENT');
    fireEvent.press(reportItem);
    
    // Should show expanded content
    expect(screen.getByText(/User was being inappropriate/i)).toBeTruthy();
  });

  it('handles report moderation actions', async () => {
    render(<UserReportReview {...defaultProps} />);
    
    // Expand the report first
    const reportItem = screen.getByText('HARASSMENT');
    fireEvent.press(reportItem);
    
    // Find and press dismiss button
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.press(dismissButton);
    
    // Should show confirmation alert
    expect(Alert.alert).toHaveBeenCalled();
  });
});

describe('UserAppealModal', () => {
  const mockReportData = {
    id: 'report-123',
    category: 'harassment',
    severity: 'medium',
    description: 'User was reported for inappropriate behavior',
    createdAt: new Date(),
    moderationAction: 'Warning issued',
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    reportData: mockReportData,
    submitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    render(<UserAppealModal {...defaultProps} />);
    
    expect(screen.getByText('Appeal Report')).toBeTruthy();
    expect(screen.getByText('harassment')).toBeTruthy();
    expect(screen.getByText('Warning issued')).toBeTruthy();
  });

  it('validates appeal reason length', () => {
    render(<UserAppealModal {...defaultProps} />);
    
    const submitButton = screen.getByText('Submit Appeal');
    fireEvent.press(submitButton);
    
    // Should show alert for missing appeal reason
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Please provide a reason for your appeal.'
    );
  });

  it('submits appeal with valid data', async () => {
    render(<UserAppealModal {...defaultProps} />);
    
    // Fill in appeal reason
    const appealInput = screen.getByPlaceholderText(/Explain why you believe/i);
    fireEvent.changeText(appealInput, 'This report was made in error. I was actually helping the user with their question and the context was misunderstood.');
    
    const submitButton = screen.getByText('Submit Appeal');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: 'report-123',
          appealReason: 'This report was made in error. I was actually helping the user with their question and the context was misunderstood.',
        })
      );
    });
  });

  it('handles evidence addition', () => {
    render(<UserAppealModal {...defaultProps} />);
    
    const addEvidenceButton = screen.getByText('Add Evidence');
    fireEvent.press(addEvidenceButton);
    
    // Should add evidence item
    expect(screen.getByText('Evidence 1')).toBeTruthy();
  });
});

describe('UserReportingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits user report successfully', async () => {
    const mockSubmitUserReport = jest.mocked(userReportingService.submitUserReport);
    mockSubmitUserReport.mockResolvedValue({ success: true, reportId: 'report-123' });

    const reportData = {
      reportedUserId: 'user-123',
      reporterId: 'reporter-456',
      category: 'harassment' as const,
      severity: 'medium' as const,
      description: 'User was being inappropriate',
      isAnonymous: false,
    };

    const result = await userReportingService.submitUserReport(reportData);

    expect(result.success).toBe(true);
    expect(result.reportId).toBe('report-123');
    expect(mockSubmitUserReport).toHaveBeenCalledWith(reportData);
  });

  it('handles report submission errors', async () => {
    const mockSubmitUserReport = jest.mocked(userReportingService.submitUserReport);
    mockSubmitUserReport.mockResolvedValue({ 
      success: false, 
      error: 'Duplicate report detected' 
    });

    const reportData = {
      reportedUserId: 'user-123',
      reporterId: 'reporter-456',
      category: 'harassment' as const,
      severity: 'medium' as const,
      description: 'User was being inappropriate',
      isAnonymous: false,
    };

    const result = await userReportingService.submitUserReport(reportData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Duplicate report detected');
  });

  it('fetches user reports with filtering', async () => {
    const mockGetUserReports = jest.mocked(userReportingService.getUserReports);
    const mockReports = [
      {
        id: 'report-1',
        reportedUser: {
          id: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          joinedAt: new Date('2023-01-01'),
          postsCount: 25,
          reportsCount: 1,
          lastActive: new Date(),
        },
        reporter: null,
        category: 'harassment' as const,
        severity: 'medium' as const,
        description: 'User was being inappropriate',
        status: 'pending' as const,
        createdAt: new Date(),
        isAnonymous: true,
      },
    ];

    mockGetUserReports.mockResolvedValue({
      reports: mockReports,
      totalCount: 1,
      hasMore: false,
    });

    const filter = { status: ['pending' as const] };
    const result = await userReportingService.getUserReports(filter);

    expect(result.reports).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(mockGetUserReports).toHaveBeenCalledWith(filter, 1, 20);
  });

  it('submits appeal successfully', async () => {
    const mockSubmitAppeal = jest.mocked(userReportingService.submitAppeal);
    mockSubmitAppeal.mockResolvedValue({ success: true, appealId: 'appeal-123' });

    const result = await userReportingService.submitAppeal(
      'user-123',
      'report-456',
      'This report was made in error',
      ['evidence1.jpg']
    );

    expect(result.success).toBe(true);
    expect(result.appealId).toBe('appeal-123');
    expect(mockSubmitAppeal).toHaveBeenCalledWith(
      'user-123',
      'report-456',
      'This report was made in error',
      ['evidence1.jpg']
    );
  });
});