import dayjs from 'dayjs';
import { isValidScheduleDate, addDaysToDate, startOfDay, addDays, isWithinInterval } from './date';

export interface NotificationScheduleResult {
  success: boolean;
  scheduledDate?: Date;
  error?: {
    code: 'INVALID_DATE' | 'PAST_DATE' | 'TIMEZONE_ERROR' | 'GENERAL_ERROR' | 'OUTSIDE_5DAY_FOCUS';
    message: string;
  };
}

export interface FiveDayScheduleOptions {
  focusStartDate?: Date;
  focusEndDate?: Date;
  allowCriticalOverride?: boolean;
  taskPriority?: 'low' | 'medium' | 'high' | 'critical';
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
 * Validates notification schedule for 5-day workflow optimization
 * Ensures notifications are optimized for the horizontal 5-day task view
 * 
 * @param baseDate - The base date for scheduling
 * @param options - 5-day workflow specific options
 * @returns NotificationScheduleResult with 5-day workflow validation
 */
export function validateNotificationSchedule5Day(
  baseDate: Date,
  options: FiveDayScheduleOptions = {}
): NotificationScheduleResult {
  try {
    // First validate with standard validation
    const standardResult = validateNotificationSchedule(baseDate);
    if (!standardResult.success) {
      return standardResult;
    }

    const {
      focusStartDate = startOfDay(new Date()),
      focusEndDate = addDays(startOfDay(new Date()), 4),
      allowCriticalOverride = true,
      taskPriority = 'medium'
    } = options;

    const scheduledDate = standardResult.scheduledDate!;
    const scheduledDay = startOfDay(scheduledDate);

    // Check if date is within 5-day focus window
    const isInFocusWindow = isWithinInterval(scheduledDay, focusStartDate, focusEndDate);

    // Allow critical tasks to extend beyond 5-day window
    const isCriticalOverride = taskPriority === 'critical' && 
      allowCriticalOverride && 
      scheduledDay <= addDays(focusEndDate, 2);

    if (!isInFocusWindow && !isCriticalOverride) {
      return {
        success: false,
        error: {
          code: 'OUTSIDE_5DAY_FOCUS',
          message: `Scheduled date is outside 5-day focus window (${focusStartDate.toDateString()} - ${focusEndDate.toDateString()})`
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
        message: error instanceof Error ? error.message : 'Unknown error in 5-day validation'
      }
    };
  }
}

/**
 * Optimizes notification timing for daily plant care workflows
 * Considers task types and plant care best practices
 * 
 * @param baseDate - The base date for scheduling
 * @param taskType - Type of plant care task
 * @param priority - Task priority level
 * @returns Optimized notification time for plant care
 */
export function optimizeForDailyPlantCare(
  baseDate: Date,
  taskType: 'watering' | 'feeding' | 'inspection' | 'pruning' | 'training' | 'defoliation' | 'flushing' | 'harvest' | 'transplant',
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Date {
  const optimizedTime = new Date(baseDate);
  
  // Optimize timing based on plant care best practices
  switch (taskType) {
    case 'watering':
    case 'feeding':
      // Best in morning (8 AM) or evening (6 PM)
      optimizedTime.setHours(priority === 'critical' ? 8 : 18, 0, 0, 0);
      break;
      
    case 'inspection':
      // Best in good light (10 AM)
      optimizedTime.setHours(10, 0, 0, 0);
      break;
      
    case 'pruning':
    case 'training':
    case 'defoliation':
      // Best in morning when plants are turgid (9 AM)
      optimizedTime.setHours(9, 0, 0, 0);
      break;
      
    case 'harvest':
      // Best in early morning (7 AM)
      optimizedTime.setHours(7, 0, 0, 0);
      break;
      
    case 'transplant':
      // Best in evening to reduce stress (5 PM)
      optimizedTime.setHours(17, 0, 0, 0);
      break;
      
    default:
      // Default to morning care time (9 AM)
      optimizedTime.setHours(9, 0, 0, 0);
  }

  // Ensure it's not in the past
  const now = new Date();
  if (optimizedTime <= now) {
    optimizedTime.setTime(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  }

  return optimizedTime;
}

/**
 * Calculates optimal notification lead time for plant care tasks
 * Different tasks need different preparation times
 * 
 * @param taskType - Type of plant care task
 * @param priority - Task priority level
 * @returns Minutes before task due time to send notification
 */
export function getPlantCareLeadTime(
  taskType: 'watering' | 'feeding' | 'inspection' | 'pruning' | 'training' | 'defoliation' | 'flushing' | 'harvest' | 'transplant',
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): number {
  const baseLead = {
    watering: 15,      // 15 minutes - quick task
    feeding: 30,       // 30 minutes - need to prepare nutrients
    inspection: 10,    // 10 minutes - quick visual check
    pruning: 45,       // 45 minutes - need tools and planning
    training: 30,      // 30 minutes - need ties/clips
    defoliation: 45,   // 45 minutes - careful planning needed
    flushing: 60,      // 1 hour - need to prepare water
    harvest: 120,      // 2 hours - major task, need tools/containers
    transplant: 180,   // 3 hours - major task, need pots/soil
  };

  const priorityMultiplier = {
    low: 0.5,
    medium: 1,
    high: 1.5,
    critical: 2,
  };

  return Math.round(baseLead[taskType] * priorityMultiplier[priority]);
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
