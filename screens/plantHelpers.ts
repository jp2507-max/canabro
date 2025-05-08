// plantHelpers.ts
// Formatting and utility helpers for PlantDetailsScreen and related plant screens

import dayjs from 'dayjs';

/**
 * Formats a date string into 'MMMM D, YYYY' or returns 'Not set' if falsy.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set';
  return dayjs(dateString).format('MMMM D, YYYY');
}

/**
 * Formats a boolean value as 'Yes', 'No', or 'N/A'.
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
}

/**
 * Formats a number with an optional unit, or returns 'Not set' if falsy.
 */
export function formatNumber(value: number | null | undefined, unit: string = ''): string {
  if (value === null || value === undefined) return 'Not set';
  return `${value}${unit}`;
}
