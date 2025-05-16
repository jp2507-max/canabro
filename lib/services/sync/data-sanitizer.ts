/**
 * Data sanitization functions for sync service
 * Handles cleaning and formatting records for Supabase
 */

import { v4 as uuid } from 'uuid';

/**
 * Format a date for Supabase
 * Handles both Date objects and numeric timestamps from WatermelonDB
 */
export function formatDateForSupabase(date: Date | number | string | null): string | null {
  if (date === null || date === undefined) return null;

  try {
    if (typeof date === 'number') {
      // Handle integers that could be timestamps - ensure correct millisecond conversion
      return new Date(date).toISOString();
    } else if (typeof date === 'string') {
      // Check if it's already an ISO string
      if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return date;
      }

      // Reject non-date strings immediately
      if (!/^[\d\-/.\\s:]+$/.test(date)) {
        console.warn(`Invalid date string detected: "${date}" - contains non-date characters`);
        return null;
      }

      // Validate date string format - only accept standard formats
      if (!/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/.test(date)) {
        console.warn(`Invalid date format detected: "${date}" - not a recognized date pattern`);
        return null;
      }

      // Try to parse it
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Could not parse date string: "${date}" - parsing resulted in Invalid Date`);
        return null;
      }
      return parsedDate.toISOString();
    } else if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        console.warn(`Invalid Date object detected`);
        return null;
      }
      return date.toISOString();
    }
  } catch (error) {
    console.error(`Error formatting date: ${date}`, error);
    return null;
  }

  console.warn(`Unknown date format: ${typeof date}`, date);
  return null;
}

/**
 * Validates if a string is a proper UUID
 *
 * @param uuid The UUID string to validate
 * @returns Boolean indicating if it's a valid UUID
 */
export function isValidUuid(uuid: string | undefined | null): boolean {
  if (typeof uuid !== 'string') return false;
  return uuid.length === 36 && /^[0-9a-f-]{36}$/i.test(uuid);
}

/**
 * Cleans up a record for Supabase insertion
 *
 * @param record The raw record from WatermelonDB
 * @param table The table name
 * @returns A cleaned record suitable for Supabase
 */
export function sanitizeRecord(record: any, table: string): any {
  // Make a copy to avoid mutating the original
  const cleanedRecord = { ...record };

  // Remove WatermelonDB system fields that should not be synced
  delete cleanedRecord._status;
  delete cleanedRecord._changed;

  // Ensure id field exists AND is not an empty string or invalid type
  if (!cleanedRecord.id || typeof cleanedRecord.id !== 'string' || cleanedRecord.id.trim() === '') {
    // Throw a specific error instead of just warning
    throw new Error(
      `Record in table ${table} has missing or invalid primary id: '${cleanedRecord.id}'`
    );
  }

  // Special handling for plants table - convert non-UUID IDs to valid UUIDs
  if (table === 'plants') {
    // Check if the ID is not already a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanedRecord.id)) {
      const originalId = cleanedRecord.id;
      const newId = uuid();
      console.log(`Converting plant ID from ${originalId} to UUID format: ${newId}`);
      cleanedRecord.id = newId;
    }

    // Handle strainId to strain_id conversion for plants table
    if (cleanedRecord.strainId !== undefined) {
      console.log(`[Plant Sync Fix] Converting strainId to strain_id: ${cleanedRecord.strainId}`);
      cleanedRecord.strain_id = cleanedRecord.strainId;
      delete cleanedRecord.strainId;
    } else if (record.strainId !== undefined) {
      // Also check the original record (before copy)
      console.log(`[Plant Sync Fix] Converting original record strainId to strain_id: ${record.strainId}`);
      cleanedRecord.strain_id = record.strainId;
    } else if (record._raw && record._raw.strainId) {
      // Try to get from _raw property if available (direct WatermelonDB record)
      console.log(`[Plant Sync Fix] Converting _raw.strainId to strain_id: ${record._raw.strainId}`);
      cleanedRecord.strain_id = record._raw.strainId;
    } else {
      console.log(`[Plant Sync Debug] Plant record has no strainId field: ${cleanedRecord.id}`);
    }

    // Check if plant has strain information and ensure strain_id is properly preserved
    if (cleanedRecord.strain && typeof cleanedRecord.strain === 'string' && !cleanedRecord.strain_id) {
      // Log that we're seeing a plant with strain name but no strain_id
      console.log(`[Plant Sync] Plant ${cleanedRecord.id} has strain name "${cleanedRecord.strain}" but no strain_id`);
    }

    // Remove any strain relation objects that shouldn't be sent to Supabase
    if (cleanedRecord.strainObj) {
      console.log(`[Plant Sync] Removing strainObj relation from plant ${cleanedRecord.id}`);
      delete cleanedRecord.strainObj;
    }
  }

  // Check all potential foreign key fields (ending in _id)
  for (const key in cleanedRecord) {
    if (key.endsWith('_id') && key !== 'id' && cleanedRecord[key] === '') {
      // Throw an error if a foreign key is an empty string
      throw new Error(
        `Record in table ${table} (id: ${cleanedRecord.id}) has invalid foreign key ${key}: ''`
      );
    }
  }

  // ============================================================
  // Date field handling section - comprehensive validation
  // ============================================================

  // Common camelCase to snake_case date field conversions
  if (cleanedRecord.createdAt) {
    cleanedRecord.created_at = formatDateForSupabase(cleanedRecord.createdAt);
    delete cleanedRecord.createdAt;
  }

  if (cleanedRecord.updatedAt) {
    cleanedRecord.updated_at = formatDateForSupabase(cleanedRecord.updatedAt);
    delete cleanedRecord.updatedAt;
  }

  if (cleanedRecord.lastSyncedAt) {
    cleanedRecord.last_synced_at = formatDateForSupabase(cleanedRecord.lastSyncedAt);
    delete cleanedRecord.lastSyncedAt;
  }

  // Ensure required date fields always have valid values
  if (!cleanedRecord.created_at || cleanedRecord.created_at === null) {
    cleanedRecord.created_at = new Date().toISOString();
  }

  if (!cleanedRecord.updated_at || cleanedRecord.updated_at === null) {
    cleanedRecord.updated_at = new Date().toISOString();
  }

  // Table-specific date field handling
  switch (table) {
    case 'profiles':
      // Remove last_synced_at if present (not a column in Supabase profiles)
      if ('last_synced_at' in cleanedRecord) {
        delete cleanedRecord.last_synced_at;
      }
      // Handle growing_since (should be a valid date or null)
      if (cleanedRecord.growing_since) {
        const formattedDate = formatDateForSupabase(cleanedRecord.growing_since);
        if (formattedDate) {
          cleanedRecord.growing_since = formattedDate;
        } else {
          console.warn(
            `Invalid growing_since "${cleanedRecord.growing_since}" for profile ${cleanedRecord.id}, removing field`
          );
          delete cleanedRecord.growing_since;
        }
      }
      break;

    case 'plants':
      // Handle planted_date
      if (cleanedRecord.plantedDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.plantedDate);
        if (formattedDate) {
          cleanedRecord.planted_date = formattedDate;
        } else {
          console.warn(
            `Invalid planted_date "${cleanedRecord.plantedDate}" for plant ${cleanedRecord.id}, using current date`
          );
          cleanedRecord.planted_date = new Date().toISOString();
        }
        delete cleanedRecord.plantedDate;
      }

      // Handle expected_harvest_date (optional)
      if (cleanedRecord.expectedHarvestDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.expectedHarvestDate);
        if (formattedDate) {
          cleanedRecord.expected_harvest_date = formattedDate;
        } else {
          console.warn(
            `Invalid expected_harvest_date "${cleanedRecord.expectedHarvestDate}" for plant ${cleanedRecord.id}, removing field`
          );
          delete cleanedRecord.expected_harvest_date; // Don't send invalid optional field
        }
        delete cleanedRecord.expectedHarvestDate;
      }
      break;

    case 'diary_entries':
    case 'journal_entries':
      // Handle entry_date
      if (cleanedRecord.entryDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.entryDate);
        if (formattedDate) {
          cleanedRecord.entry_date = formattedDate;
        } else {
          console.warn(
            `Invalid entry_date "${cleanedRecord.entryDate}" for entry ${cleanedRecord.id}, using current date`
          );
          cleanedRecord.entry_date = cleanedRecord.created_at || new Date().toISOString();
        }
        delete cleanedRecord.entryDate;
      } else if (!cleanedRecord.entry_date) {
        // Ensure entry_date always exists
        cleanedRecord.entry_date = cleanedRecord.created_at || new Date().toISOString();
      }
      break;

    case 'plant_tasks':
      // Handle due_date
      if (cleanedRecord.dueDate) {
        const formattedDate = formatDateForSupabase(cleanedRecord.dueDate);
        if (formattedDate) {
          cleanedRecord.due_date = formattedDate;
        } else {
          console.warn(
            `Invalid due_date "${cleanedRecord.dueDate}" for task ${cleanedRecord.id}, using current date`
          );
          cleanedRecord.due_date = new Date().toISOString();
        }
        delete cleanedRecord.dueDate;
      } else if (!cleanedRecord.due_date) {
        // Ensure due_date always exists if it's a required field
        cleanedRecord.due_date = new Date().toISOString();
      }
      break;
  }

  // Final strict validation for any remaining date-like fields
  // Look for common naming patterns for date fields
  const dateFieldPatterns = [/_date$/, /_at$/, /Date$/, /At$/];
  Object.keys(cleanedRecord).forEach((key) => {
    const mightBeDateField = dateFieldPatterns.some((pattern) => pattern.test(key));
    if (!mightBeDateField) return;

    // Skip fields we've already properly handled
    if (
      key === 'created_at' ||
      key === 'updated_at' ||
      key === 'last_synced_at' ||
      key === 'planted_date' ||
      key === 'expected_harvest_date' ||
      key === 'entry_date' ||
      key === 'due_date'
    ) {
      return;
    }

    const value = cleanedRecord[key];
    // Only process string or number values
    if (typeof value !== 'string' && typeof value !== 'number') return;

    // Strict ISO 8601 check
    const isValidISODate =
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/.test(value) &&
      !isNaN(Date.parse(value));

    if (!isValidISODate) {
      // Try to format the date properly
      const formattedDate = formatDateForSupabase(value);
      if (formattedDate) {
        cleanedRecord[key] = formattedDate;
      } else {
        // If formatting fails, remove the field and log a warning
        console.warn(
          `Strict date validation: removing invalid date field ${key} with value "${value}" from ${table} record (id: ${cleanedRecord.id}) to avoid sync errors`
        );
        delete cleanedRecord[key];
      }
    }
  });

  return cleanedRecord;
}
