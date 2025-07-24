
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/de';
import 'dayjs/locale/en';

// Extend dayjs with plugins we need
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Locale-aware date formatting utility
// Usage: const formatted = formatLocaleDate(date, { language })
export function formatLocaleDate(
  date: Parameters<typeof dayjs>[0],
  opts?: { format?: string; language?: 'en' | 'de' }
): string {
  // Always require language to be passed explicitly, or fallback to 'en'
  const lang: 'en' | 'de' = opts?.language || 'en';
  // Use European format for both 'en' and 'de'
  const formatStr = opts?.format || 'DD.MM.YYYY';
  return dayjs(date).locale(lang).format(formatStr);
}

// Helper to map date-fns style tokens to dayjs format tokens when simple mapping exists
const mapFormatToken = (token: string): string => {
  switch (token) {
    case 'PPP':
      // Example: Apr 5, 2025
      return 'MMM D, YYYY';
    default:
      return token;
  }
};

export function format(date: Parameters<typeof dayjs>[0], formatStr: string): string {
  return dayjs(date).format(mapFormatToken(formatStr));
}

export function parseISO(isoString: string): Date {
  const parsed = dayjs(isoString);
  
  if (!parsed.isValid()) {
    throw new Error(`Invalid ISO date string: "${isoString}"`);
  }
  
  return parsed.toDate();
}

export function isValid(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isValid();
}

export function addDays(date: Parameters<typeof dayjs>[0], amount: number): Date {
  return dayjs(date).add(amount, 'day').toDate();
}

export function isToday(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function isYesterday(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
}

export function isTomorrow(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isSame(dayjs().add(1, 'day'), 'day');
}

export function isSameDay(date1: Parameters<typeof dayjs>[0], date2: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date1).isSame(dayjs(date2), 'day');
}

/**
 * Validates if a date is in the future, accounting for timezone differences
 * and providing a safety buffer to prevent false positives
 * 
 * @param date - The date to validate
 * @param bufferMinutes - Buffer in minutes to account for timezone/processing delays (default: 1)
 * @returns true if the date is safely in the future
 */
export function isFutureDate(date: Parameters<typeof dayjs>[0], bufferMinutes: number = 1): boolean {
  const now = dayjs();
  const targetDate = dayjs(date);
  
  // Add buffer to current time to account for timezone differences and processing delays
  const nowWithBuffer = now.add(bufferMinutes, 'minute');
  
  return targetDate.isAfter(nowWithBuffer);
}

/**
 * Creates a timezone-aware date comparison for notifications
 * Ensures the scheduled date is at least 1 minute in the future
 * 
 * @param scheduledDate - The date to schedule for
 * @param minMinutesInFuture - Minimum minutes in the future (default: 1)
 * @returns true if the date is valid for scheduling
 */
export function isValidScheduleDate(
  scheduledDate: Parameters<typeof dayjs>[0], 
  minMinutesInFuture: number = 1
): boolean {
  return isFutureDate(scheduledDate, minMinutesInFuture);
}

/**
 * Safely adds days to a date and returns a new Date object
 * 
 * @param date - The base date
 * @param days - Number of days to add
 * @returns New Date object with days added
 */
export function addDaysToDate(date: Parameters<typeof dayjs>[0], days: number): Date {
  if (!Number.isFinite(days)) {
    throw new Error('addDaysToDate: days parameter must be a finite number');
  }
  return dayjs(date).add(days, 'day').toDate();
} 