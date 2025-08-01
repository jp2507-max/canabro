/**
 * Sanitizes a string by trimming whitespace.
 * More sophisticated sanitization can be added here if needed (e.g., removing special characters).
 * @param value - The string to sanitize.
 * @returns The sanitized string, or an empty string if the input is null or undefined.
 */
export function sanitizeString(value: string | null | undefined): string {
  return value ? value.trim() : '';
}

/**
 * Parses a value that might be a number or a string representation of a number.
 * @param value - The value to parse.
 * @returns The parsed number, or undefined if parsing is not possible or value is null/undefined.
 */
/**
 * Parses an optional number from various input types
 */
export function parseOptionalNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Parses an optional string array from various input types
 */
export function parseOptionalStringArray(value: string | string[] | null | undefined): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Handle comma-separated or JSON string format
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  }
  return null;
}

/**
 * Parses a value that might be a JSON string array or an actual array.
 * @param value - The value to parse.
 * @returns An array of strings, or an empty array if parsing fails or value is null/undefined.
 */
export function parseOptionalStringArray(value: string[] | string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string');
      }
      return [];
    } catch (error) {
      // If parsing fails, and it's a non-empty string, perhaps it's a single item not in an array format.
      // This part depends on expected data format. For now, assume it should be a valid JSON array.
      console.warn('Failed to parse string as JSON array:', value, error);
      return [];
    }
  }
  return [];
}

/**
 * Parses a string or number into a number, attempting to extract from strings like "15-20%" or "22%".
 * Returns null if parsing is not possible or value is "Unknown".
 */
export function parsePercentageString(value?: string | number | null): number | null {
  if (value === null || value === undefined || String(value).toLowerCase() === 'unknown') {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  // Attempt to match the first number in strings like "15-20%", "22%", "Approx 18"
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (match && match[1]) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Extracts flowering time in weeks from a string.
 * Handles formats like "8-10 weeks", "60 days".
 * Returns an object with min and max weeks, or nulls if not parsable.
 */
export interface FloweringTimeInWeeks {
  minWeeks: number | null;
  maxWeeks: number | null;
}

export function extractFloweringTime(value?: string | number | null): FloweringTimeInWeeks {
  const result: FloweringTimeInWeeks = { minWeeks: null, maxWeeks: null };
  if (value === null || value === undefined) {
    return result;
  }

  const strValue = String(value).toLowerCase();

  // Check for week ranges, e.g., "8-10 weeks", "7-9 weeks"
  const weekRangeMatch = strValue.match(/(\d+)\s*-\s*(\d+)\s*(?:weeks?|wks?)/i);
  if (weekRangeMatch && weekRangeMatch[1] && weekRangeMatch[2]) {
    result.minWeeks = parseInt(weekRangeMatch[1], 10);
    result.maxWeeks = parseInt(weekRangeMatch[2], 10);
    if (!isNaN(result.minWeeks) && !isNaN(result.maxWeeks)) return result;
  }

  // Check for single week values, e.g., "8 weeks", "10wks"
  const singleWeekMatch = strValue.match(/(\d+)\s*(?:weeks?|wks?)/i);
  if (singleWeekMatch && singleWeekMatch[1]) {
    result.minWeeks = parseInt(singleWeekMatch[1], 10);
    result.maxWeeks = result.minWeeks; // If single value, min and max are the same
    if (!isNaN(result.minWeeks)) return result;
  }

  // Check for day ranges, e.g., "55-65 days"
  const dayRangeMatch = strValue.match(/(\d+)\s*-\s*(\d+)\s*(?:days?|dys?)/i);
  if (dayRangeMatch && dayRangeMatch[1] && dayRangeMatch[2]) {
    const minDays = parseInt(dayRangeMatch[1], 10);
    const maxDays = parseInt(dayRangeMatch[2], 10);
    if (!isNaN(minDays) && !isNaN(maxDays)) {
      result.minWeeks = Math.round(minDays / 7);
      result.maxWeeks = Math.round(maxDays / 7);
      return result;
    }
  }

  // Check for single day values, e.g., "60 days", "70dys"
  const singleDayMatch = strValue.match(/(\d+)\s*(?:days?|dys?)/i);
  if (singleDayMatch && singleDayMatch[1]) {
    const days = parseInt(singleDayMatch[1], 10);
    if (!isNaN(days)) {
      result.minWeeks = Math.round(days / 7);
      result.maxWeeks = result.minWeeks;
      return result;
    }
  }

  // If it's just a number, assume it might be days if large, or weeks if small (heuristic)
  if (typeof value === 'number' && !isNaN(value)) {
    if (value > 30) {
      // Arbitrary threshold: if > 30, assume days
      result.minWeeks = Math.round(value / 7);
      result.maxWeeks = result.minWeeks;
    } else {
      // Assume weeks
      result.minWeeks = value;
      result.maxWeeks = value;
    }
    return result;
  }

  // Reset if no valid parsing occurred for safety, though initial state is nulls
  result.minWeeks = null;
  result.maxWeeks = null;
  return result;
}
