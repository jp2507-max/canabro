/**
 * Date utility functions
 * Enhanced with strain calendar integration utilities
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

// Default timezone used across the app
export const DEFAULT_TZ = 'Europe/Berlin';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// Default timezone for plant scheduling context (Europe/Berlin)
// Use optional chaining so this safely no-ops if the timezone plugin isn't loaded
dayjs.tz?.setDefault(DEFAULT_TZ);

// Re-export configured dayjs so consumers can keep using the familiar API
export default dayjs;

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return dayjs(date).add(days, 'day').toDate();
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return dayjs(date).add(weeks, 'week').toDate();
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: string = 'MMM D, YYYY'): string {
  return dayjs(date).format(format);
}

/**
 * Get days until a future date (negative if past)
 */
export function getDaysUntil(date: Date): number {
  return dayjs(date).diff(dayjs(), 'day');
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dayjs(date1).isSame(dayjs(date2), 'day');
}

/**
 * Check if a date is within an interval
 */
export function isWithinInterval(date: Date, start: Date, end: Date): boolean {
  const target = dayjs(date);
  return !target.isBefore(dayjs(start)) && !target.isAfter(dayjs(end));
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  return dayjs(date).startOf('day').toDate();
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 weeks")
 */
export function getRelativeTime(date: Date): string {
  return dayjs(date).fromNow();
}

/**
 * Subtract days from a date
 */
export function subDays(date: Date, days: number): Date {
  return dayjs(date).subtract(days, 'day').toDate();
}

/**
 * Format date for display (alias for formatDate for compatibility)
 */
export function format(date: Date, formatStr: string = 'MMM D, YYYY'): string {
  return dayjs(date).format(formatStr);
}

/**
 * Get difference in days between two dates
 */
export function differenceInDays(date1: Date, date2: Date): number {
  return dayjs(date1).diff(dayjs(date2), 'day');
}

/**
 * Parse ISO string to Date object
 */
export function parseISO(dateString: string): Date {
  return dayjs(dateString).toDate();
}

/**
 * Check if date is valid
 */
export function isValid(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return dayjs(date).isValid();
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  return dayjs(date).isSame(dayjs().add(1, 'day'), 'day');
}

/**
 * Format date with locale support
 */
export function formatLocaleDate(
  date: Date, 
  options: string | { format?: string; language?: string } = 'en-US'
): string {
  // If a string is provided, treat it as a language code and use default format
  if (typeof options === 'string') {
    const language = options;
    return dayjs(date).locale(language).format('MMM D, YYYY');
  }

  const { format = 'MMM D, YYYY', language = 'en' } = options;
  return dayjs(date).locale(language).format(format);
}

/**
 * Check if a date is valid for scheduling (not in the past)
 */
export function isValidScheduleDate(date: Date, minMinutesInFuture: number = 0): boolean {
  const now = dayjs();
  const target = dayjs(date).add(minMinutesInFuture, 'minute');
  return target.isAfter(now);
}

/**
 * Add days to date and return new Date
 */
export function addDaysToDate(date: Date, days: number): Date {
  // Alias maintained for backwards compatibility
  return addDays(date, days);
}