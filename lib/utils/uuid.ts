/**
 * UUID utilities for handling and converting between UUID and other ID formats.
 * These functions ensure consistency when working with Supabase (which requires UUIDs)
 * and other systems that might use different ID formats.
 */

import { v4 as uuidv4, validate as isValidUuidOriginal } from 'uuid';

/**
 * Regular expression pattern for validating UUID v4 format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Namespace for generating deterministic UUIDs (RFC4122 DNS namespace)
 */
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generates a new UUID v4
 * @returns A new randomly generated UUID v4 string
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * Validates if a string is a proper UUID v4
 * @param id - The string to validate
 * @returns True if the string is a valid UUID v4, false otherwise
 */
export function isUuid(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return isValidUuidOriginal(id);
}

/**
 * Ensures that the provided string is a valid UUID.
 * If the input is already a UUID, it's returned as is.
 * If not, it generates a deterministic UUID based on the input string.
 *
 * @param id - The ID string to convert to UUID format
 * @returns A valid UUID string, or null if input is falsy
 */
export function ensureUuid(id?: string | null): string | null {
  if (!id) return null;
  if (isUuid(id)) return id;

  // Create a deterministic hash from the input string
  // This ensures the same input always produces the same UUID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }

  // Use the hash to create a deterministic UUID-like string
  const segments = [
    hash.toString(16).padStart(8, '0').slice(0, 8),
    (hash >> 8).toString(16).padStart(4, '0').slice(0, 4),
    // Version 4 UUID always has the 13th character as '4'
    '4' + (hash >> 16).toString(16).padStart(3, '0').slice(0, 3),
    // Variant bits for UUID (10xx) - always starts with 8, 9, A, or B
    (((hash >> 24) & 0x3) | 0x8).toString(16) +
      (hash >> 28).toString(16).padStart(3, '0').slice(0, 3),
    Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12),
  ];

  return segments.join('-');
}

/**
 * Extracts a UUID from a string that might contain additional information
 * @param input - String that might contain a UUID
 * @returns The extracted UUID if found, null otherwise
 */
export function extractUuid(input: string): string | null {
  if (!input) return null;

  const matches = input.match(UUID_REGEX);
  return matches && matches.length > 0 ? matches[0] : null;
}

/**
 * Compares two UUIDs for equality, with case-insensitive comparison
 * @param uuid1 - First UUID to compare
 * @param uuid2 - Second UUID to compare
 * @returns True if the UUIDs are equal, false otherwise
 */
export function areUuidsEqual(uuid1?: string | null, uuid2?: string | null): boolean {
  if (!uuid1 || !uuid2) return false;
  return uuid1.toLowerCase() === uuid2.toLowerCase();
}

/**
 * Validates if a string is a UUID
 * @param uuid - The string to check
 * @returns True if valid UUID, false otherwise
 */
export function isValidUuid(uuid?: string | null): boolean {
  if (!uuid) return false;
  return isValidUuidOriginal(uuid);
}
