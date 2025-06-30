export function parseStringArray(value: string | null | undefined): string[] | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  // Ensure we're working with a string, trim it.
  const strValue = String(value).trim();

  // Handle cases like empty string, "null", "undefined" after string conversion and trim
  if (
    strValue === '' ||
    strValue.toLowerCase() === 'null' ||
    strValue.toLowerCase() === 'undefined'
  ) {
    return undefined;
  }

  // Try parsing as JSON array if it looks like one
  if (strValue.startsWith('[') && strValue.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(strValue);
      if (Array.isArray(parsedJson) && parsedJson.every((item) => typeof item === 'string')) {
        // Filter out empty strings from the array and trim items
        const result = parsedJson
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0);
        // Return undefined if the array is empty after processing, to be consistent
        return result.length > 0 ? result : undefined;
      }
      // If it's valid JSON but not a string array, we'll fall through to comma splitting,
      // though this scenario might indicate a different kind of data.
      // For now, the priority is to correctly parse string arrays if provided in JSON format.
    } catch {
      // Not a valid JSON array string, or error during parsing.
      // Fall through to comma-separated parsing.
      // console.warn('Failed to parse as JSON array, falling back to comma-separated:', strValue, error);
    }
  }

  // Fallback to comma-separated parsing
  const result = strValue
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return result.length > 0 ? result : undefined;
}
