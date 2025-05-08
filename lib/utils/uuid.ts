/**
 * UUID utilities for handling ID conversions
 */

import { v4 as uuidv4, v5 as uuidv5, validate as isValidUuid } from 'uuid';

// Define a fixed namespace UUID for consistent generation of UUIDs from strings
// This ensures the same input will always produce the same output UUID
const STRAINS_NAMESPACE = '44f7655a-3219-5e90-b7d1-3306393b95a1';

/**
 * Converts any string ID to a valid UUID.
 * If the ID is already a valid UUID, it will be returned as is.
 * Otherwise, a deterministic UUID v5 will be generated from the original ID.
 * 
 * @param id - The ID to convert to UUID format
 * @returns A valid UUID string
 */
export function ensureUuid(id: string | undefined | null): string | null {
  // Return null for undefined or null inputs
  if (id === undefined || id === null) return null;
  
  // If already a valid UUID, return as is
  if (isValidUuid(id)) return id;
  
  // Otherwise, generate a deterministic UUID v5 from the original ID
  // This ensures the same ID always converts to the same UUID
  return uuidv5(id, STRAINS_NAMESPACE);
}

/**
 * Generates a new random UUID v4
 * 
 * @returns A new UUID string
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * Checks if a string is a valid UUID
 * 
 * @param id - The string to check
 * @returns True if the string is a valid UUID, false otherwise
 */
export function isUuid(id: string | undefined | null): boolean {
  if (id === undefined || id === null) return false;
  return isValidUuid(id);
}