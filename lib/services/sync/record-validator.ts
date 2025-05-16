/**
 * Record validation utilities for WatermelonDB sync
 *
 * These functions ensure records meet the requirements for synchronization
 */

import { isValidUuid } from './data-sanitizer';

/**
 * Validates a record before sync to ensure it meets WatermelonDB requirements
 *
 * Records must:
 * - Be valid objects
 * - Have an 'id' field that is a non-empty string
 * - NOT have _status or _changed WatermelonDB internal fields
 *
 * @param record The record to validate
 * @param tableName The table name for better error reporting
 * @throws Error if record is invalid
 */
export function validateRecord(record: unknown, tableName: string): void {
  // Check if record is an object
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(
      `[Sync] Invalid raw record supplied to Sync for table "${tableName}". Records must be objects.`
    );
  }

  // Check if record has a valid ID
  const typedRecord = record as Record<string, unknown>;

  if (!('id' in typedRecord) || typeof typedRecord.id !== 'string' || !typedRecord.id.trim()) {
    throw new Error(
      `[Sync] Invalid raw record supplied to Sync for table "${tableName}". Records must have an 'id' field.`
    );
  }

  // Check for internal WatermelonDB fields
  if ('_status' in typedRecord || '_changed' in typedRecord) {
    throw new Error(
      `[Sync] Invalid raw record supplied to Sync for table "${tableName}". Records must NOT have '_status' or '_changed' fields.`
    );
  }
}

/**
 * Processes an array of records to ensure they are valid for sync
 * This will either return a sanitized array or throw an error
 *
 * @param records Array of records to validate
 * @param tableName Table name for error reporting
 * @returns Array of validated records
 * @throws Error if any record is invalid
 */
export function validateRecordBatch(
  records: unknown[],
  tableName: string
): Record<string, unknown>[] {
  if (!Array.isArray(records)) {
    throw new Error(`[Sync] Invalid records batch for table "${tableName}". Expected an array.`);
  }

  return records.map((record) => {
    validateRecord(record, tableName);
    return record as Record<string, unknown>;
  });
}

/**
 * Validates records in a change set before syncing
 * This is specifically for profiles to ensure they have correct format
 *
 * @param changes The changes to validate
 * @param table The table name
 */
export function validateProfileChanges(
  created: unknown[],
  updated: unknown[],
  table: string
): { valid: unknown[]; invalid: unknown[] } {
  const valid: unknown[] = [];
  const invalid: unknown[] = [];

  // Process all records
  const allRecords = [...created, ...updated];

  for (const record of allRecords) {
    try {
      validateRecord(record, table);
      valid.push(record);
    } catch (error) {
      console.warn(`Invalid record in ${table}:`, error);
      invalid.push(record);
    }
  }

  return { valid, invalid };
}

/**
 * Special handling for profile records
 * Ensures profile records have correct structure and required fields
 *
 * @param profiles Array of profile records
 * @returns Valid profile records
 */
export function sanitizeProfileRecords(
  profiles: Record<string, unknown>[]
): Record<string, unknown>[] {
  return profiles.map((profile) => {
    // Create a clean copy to avoid mutating the original
    const sanitized = { ...profile };

    // Ensure id is a string and present
    if (typeof sanitized.id !== 'string' || !sanitized.id) {
      throw new Error(`[Sync] Profile record missing required 'id' field`);
    }

    // Remove internal WatermelonDB fields if they exist
    delete sanitized._status;
    delete sanitized._changed;

    // Ensure user_id is present (accept both camelCase and snake_case variants)
    if (!sanitized.user_id && sanitized.userId) {
      sanitized.user_id = sanitized.userId;
      delete sanitized.userId;
    }

    // Check if user_id is valid
    if (!sanitized.user_id || typeof sanitized.user_id !== 'string') {
      throw new Error(
        `[Sync] Profile record has invalid or missing user_id: ${JSON.stringify(sanitized)}`
      );
    }

    return sanitized;
  });
}

/**
 * Special validation for plant records to enforce strain_id presence when possible
 *
 * @param plantRecord The plant record to validate
 * @returns The validated and corrected plant record
 */
export function validatePlantRecord(plantRecord: any): any {
  if (!plantRecord || typeof plantRecord !== 'object') {
    throw new Error('Invalid plant record: not an object');
  }

  const validatedRecord = { ...plantRecord };

  console.log(`[Plant Validation] Validating plant "${validatedRecord.name}" (ID: ${validatedRecord.id})`);
  console.log(`[Plant Validation] Initial strain data - strainId: ${validatedRecord.strainId}, strain_id: ${validatedRecord.strain_id}, strain: ${validatedRecord.strain}`);

  // Handle camelCase vs snake_case field names (bidirectional)
  if (validatedRecord.strainId && !validatedRecord.strain_id) {
    console.log(`[Plant Validation] Converting strainId ${validatedRecord.strainId} to strain_id`);
    validatedRecord.strain_id = validatedRecord.strainId;
  } else if (validatedRecord.strain_id && !validatedRecord.strainId) {
    console.log(`[Plant Validation] Converting strain_id ${validatedRecord.strain_id} to strainId`);
    validatedRecord.strainId = validatedRecord.strain_id;
  }

  // Handle empty string as null for strain_id
  if (validatedRecord.strain_id === '') {
    console.log(`[Plant Validation] Converting empty string strain_id to null`);
    validatedRecord.strain_id = null;
  }
  if (validatedRecord.strainId === '') {
    console.log(`[Plant Validation] Converting empty string strainId to null`);
    validatedRecord.strainId = null;
  }

  // Get the most reliable strain ID (prioritize snake_case for DB interactions)
  const effectiveStrainId = validatedRecord.strain_id || validatedRecord.strainId;

  // If we have a strain ID but no strainObj, try to load the strain data
  if (effectiveStrainId && !validatedRecord.strainObj) {
    try {
      // Import dynamically to avoid circular dependencies
      const { getStrainById } = require('../../data/strains');
      console.log(`[Plant Validation] Attempting to load strain with ID: ${effectiveStrainId}`);
      const strain = getStrainById(effectiveStrainId);
      
      if (strain) {
        console.log(`[Plant Validation] Found strain "${strain.name}" for ID ${effectiveStrainId}`);
        validatedRecord.strainObj = strain;
        
        // Ensure consistency with the strain name
        if (validatedRecord.strain !== strain.name) {
          console.log(`[Plant Validation] Updating strain name from "${validatedRecord.strain}" to "${strain.name}"`);
          validatedRecord.strain = strain.name;
        }
      } else {
        console.warn(`[Plant Validation] No strain found for ID ${effectiveStrainId}`);
      }
    } catch (error) {
      console.error('[Plant Validation] Error loading strain:', error);
    }
  }

  console.log(`[Plant Validation] Final strain data - strainId: ${validatedRecord.strainId}, strain_id: ${validatedRecord.strain_id}, strain: ${validatedRecord.strain}`);
  return validatedRecord;
}
