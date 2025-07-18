import {
  validateNotificationSchedule,
  formatScheduleError,
  debugScheduleResult,
  NotificationScheduleResult,
} from '../notification-scheduling';

// Mock console methods for testing
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('notification-scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateNotificationSchedule', () => {
    it('should return success for valid future date', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const result = validateNotificationSchedule(futureDate, 0, 1);

      expect(result.success).toBe(true);
      expect(result.scheduledDate).toEqual(futureDate);
      expect(result.error).toBeUndefined();
    });

    it('should return success for date with days added', () => {
      const baseDate = new Date();
      const result = validateNotificationSchedule(baseDate, 1, 1);

      expect(result.success).toBe(true);
      expect(result.scheduledDate).toBeDefined();
      expect(result.error).toBeUndefined();
      
      // Check that date is approximately 1 day in the future
      const expectedDate = new Date(baseDate);
      expectedDate.setDate(expectedDate.getDate() + 1);
      const timeDiff = Math.abs(result.scheduledDate!.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should return error for past date', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const result = validateNotificationSchedule(pastDate, 0, 1);

      expect(result.success).toBe(false);
      expect(result.scheduledDate).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PAST_DATE');
      expect(result.error?.message).toContain('minutes in the past');
    });

    it('should return error for invalid date', () => {
      const invalidDate = new Date('invalid-date');
      const result = validateNotificationSchedule(invalidDate, 0, 1);

      expect(result.success).toBe(false);
      expect(result.scheduledDate).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_DATE');
      expect(result.error?.message).toContain('Invalid date provided');
    });

    it('should handle timezone edge cases', () => {
      // Test with a date that's just barely in the future
      const edgeDate = new Date(Date.now() + 30 * 1000); // 30 seconds from now
      const result = validateNotificationSchedule(edgeDate, 0, 0.5); // 30 seconds buffer

      expect(result.success).toBe(true);
      expect(result.scheduledDate).toEqual(edgeDate);
    });

    it('should respect custom minimum minutes buffer', () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      const result = validateNotificationSchedule(futureDate, 0, 5); // 5 minutes buffer

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PAST_DATE');
    });

    it('should handle exceptions gracefully', () => {
      // Mock Date constructor to throw error
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date constructor error');
      }) as unknown as DateConstructor;

      const result = validateNotificationSchedule(new originalDate(), 0, 1);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GENERAL_ERROR');
      expect(result.error?.message).toContain('Date constructor error');

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('formatScheduleError', () => {
    it('should format PAST_DATE error correctly', () => {
      const error = {
        code: 'PAST_DATE' as const,
        message: 'Test message',
      };
      const result = formatScheduleError(error);

      expect(result).toBe('The scheduled date is in the past. Please select a future date.');
    });

    it('should format INVALID_DATE error correctly', () => {
      const error = {
        code: 'INVALID_DATE' as const,
        message: 'Test message',
      };
      const result = formatScheduleError(error);

      expect(result).toBe('Invalid date provided. Please check your date selection.');
    });

    it('should format TIMEZONE_ERROR error correctly', () => {
      const error = {
        code: 'TIMEZONE_ERROR' as const,
        message: 'Test message',
      };
      const result = formatScheduleError(error);

      expect(result).toBe('Timezone error occurred. Please try again.');
    });

    it('should format GENERAL_ERROR with fallback message', () => {
      const error = {
        code: 'GENERAL_ERROR' as const,
        message: 'Test message',
      };
      const result = formatScheduleError(error);

      expect(result).toBe('Unable to schedule notification. Please try again.');
    });

    it('should return fallback message for undefined error', () => {
      const result = formatScheduleError(undefined, 'Custom fallback');

      expect(result).toBe('Custom fallback');
    });

    it('should return default fallback message for undefined error', () => {
      const result = formatScheduleError(undefined);

      expect(result).toBe('Unable to schedule notification');
    });
  });

  describe('debugScheduleResult', () => {
    beforeEach(() => {
      // Mock __DEV__ to be true
      (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    });

    afterEach(() => {
      (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    });

    it('should log success result in development mode', () => {
      const successResult: NotificationScheduleResult = {
        success: true,
        scheduledDate: new Date('2025-01-01T12:00:00Z'),
      };

      debugScheduleResult(successResult, 'Test context');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[Test context] Success:',
        expect.stringContaining('"success":true')
      );
    });

    it('should log error result in development mode', () => {
      const errorResult: NotificationScheduleResult = {
        success: false,
        error: {
          code: 'PAST_DATE',
          message: 'Test error message',
        },
      };

      debugScheduleResult(errorResult, 'Test context');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[Test context] Error:',
        expect.stringContaining('"success":false')
      );
    });

    it('should not log in production mode', () => {
      (global as unknown as { __DEV__: boolean }).__DEV__ = false;

      const successResult: NotificationScheduleResult = {
        success: true,
        scheduledDate: new Date(),
      };

      debugScheduleResult(successResult, 'Test context');

      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should use default context when none provided', () => {
      const successResult: NotificationScheduleResult = {
        success: true,
        scheduledDate: new Date(),
      };

      debugScheduleResult(successResult);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[Notification scheduling] Success:',
        expect.any(String)
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical notification scheduling flow', () => {
      // Simulate scheduling a notification for 1 hour from now
      const baseDate = new Date();
      const hoursFromNow = 1;
      const minutesFromNow = hoursFromNow * 60;
      
      baseDate.setMinutes(baseDate.getMinutes() + minutesFromNow);

      const result = validateNotificationSchedule(baseDate, 0, 1);

      expect(result.success).toBe(true);
      expect(result.scheduledDate).toBeDefined();
      
      // Verify date is approximately 1 hour in the future
      const timeDiff = result.scheduledDate!.getTime() - Date.now();
      expect(timeDiff).toBeGreaterThan(55 * 60 * 1000); // At least 55 minutes
      expect(timeDiff).toBeLessThan(65 * 60 * 1000); // At most 65 minutes
    });

    it('should handle snooze scenario correctly', () => {
      // Simulate snoozing a notification by 1 day
      const baseDate = new Date();
      const result = validateNotificationSchedule(baseDate, 1, 1);

      expect(result.success).toBe(true);
      expect(result.scheduledDate).toBeDefined();
      
      // Verify date is approximately 1 day in the future
      const timeDiff = result.scheduledDate!.getTime() - Date.now();
      expect(timeDiff).toBeGreaterThan(23 * 60 * 60 * 1000); // At least 23 hours
      expect(timeDiff).toBeLessThan(25 * 60 * 60 * 1000); // At most 25 hours
    });

    it('should handle timezone-sensitive scheduling', () => {
      // Test with a date that could be problematic across timezones
      const potentiallyProblematicDate = new Date();
      potentiallyProblematicDate.setMinutes(potentiallyProblematicDate.getMinutes() + 5);

      const result = validateNotificationSchedule(potentiallyProblematicDate, 0, 1);

      expect(result.success).toBe(true);
      expect(result.scheduledDate).toBeDefined();
    });
  });
});
