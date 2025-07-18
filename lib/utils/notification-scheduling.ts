import dayjs from 'dayjs';
import { isValidScheduleDate, addDaysToDate } from './date';

export interface NotificationScheduleResult {
  success: boolean;
  scheduledDate?: Date;
  error?: {
    code: 'INVALID_DATE' | 'PAST_DATE' | 'TIMEZONE_ERROR' | 'GENERAL_ERROR';
    message: string;
  };
}

/**
 * Validates and prepares a date for notification scheduling
 * Handles timezone differences and provides comprehensive error reporting
 * 
 * @param baseDate - The base date for scheduling
 * @param daysFromNow - Number of days to add to the base date (default: 0)
 * @param minMinutesInFuture - Minimum minutes in the future for valid scheduling (default: 1)
 * @returns NotificationScheduleResult with success status and either scheduledDate or error
 */
export function validateNotificationSchedule(
  baseDate: Date,
  daysFromNow: number = 0,
  minMinutesInFuture: number = 1
): NotificationScheduleResult {
  try {
    // Create a copy of the base date to avoid mutations
    const scheduledDate = new Date(baseDate);
    
    // Add days if specified
    if (daysFromNow > 0) {
      const adjustedDate = addDaysToDate(scheduledDate, daysFromNow);
      scheduledDate.setTime(adjustedDate.getTime());
    }
    
    // Validate the scheduled date
    if (!dayjs(scheduledDate).isValid()) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: `Invalid date provided: ${scheduledDate.toString()}`
        }
      };
    }
    
    // Check if date is in the future with timezone safety
    if (!isValidScheduleDate(scheduledDate, minMinutesInFuture)) {
      const now = dayjs();
      const target = dayjs(scheduledDate);
      const diffMinutes = target.diff(now, 'minute', true);
      
      return {
        success: false,
        error: {
          code: 'PAST_DATE',
          message: `Scheduled date is ${Math.abs(diffMinutes).toFixed(1)} minutes in the ${diffMinutes < 0 ? 'past' : 'future'} (minimum: ${minMinutesInFuture} minutes)`
        }
      };
    }
    
    return {
      success: true,
      scheduledDate
    };
    
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'GENERAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }
}

/**
 * Formats a notification schedule error for user display
 * 
 * @param error - The error from validateNotificationSchedule
 * @param fallbackMessage - Fallback message if error is undefined
 * @returns User-friendly error message
 */
export function formatScheduleError(
  error?: NotificationScheduleResult['error'],
  fallbackMessage: string = 'Unable to schedule notification'
): string {
  if (!error) return fallbackMessage;
  
  switch (error.code) {
    case 'PAST_DATE':
      return 'The scheduled date is in the past. Please select a future date.';
    case 'INVALID_DATE':
      return 'Invalid date provided. Please check your date selection.';
    case 'TIMEZONE_ERROR':
      return 'Timezone error occurred. Please try again.';
    default:
      return 'Unable to schedule notification. Please try again.';
  }
}

/**
 * Debug helper to log notification scheduling details
 * Only logs in development mode
 * 
 * @param result - The result from validateNotificationSchedule
 * @param context - Additional context for logging
 */
export function debugScheduleResult(
  result: NotificationScheduleResult,
  context: string = 'Notification scheduling'
): void {
  if (__DEV__) {
    const now = dayjs();
    const logData = {
      context,
      success: result.success,
      currentTime: now.toISOString(),
      scheduledDate: result.scheduledDate?.toISOString(),
      error: result.error,
      timezoneOffset: now.utcOffset(),
    };
    
    if (result.success) {
      console.warn(`[${context}] Success:`, JSON.stringify(logData, null, 2));
    } else {
      console.error(`[${context}] Error:`, JSON.stringify(logData, null, 2));
    }
  }
}
