/**
 * Utility for mapping between UUID and MongoDB ObjectId formats for strains
 * This helps with API calls that require the original MongoDB ObjectId
 */

// In-memory cache of mappings for runtime use
const idMappingCache = new Map<string, string>();

/**
 * Store a mapping between UUID and ObjectId
 */
export function storeIdMapping(uuid: string, objectId: string): void {
  if (uuid && objectId) {
    idMappingCache.set(uuid, objectId);
    // Also store reverse mapping for convenience
    idMappingCache.set(objectId, uuid);
  }
}

/**
 * Get the MongoDB ObjectId for a UUID
 * @returns The MongoDB ObjectId or null if mapping doesn't exist
 */
export function getObjectIdFromUuid(uuid: string): string | null {
  // If the ID is already an ObjectId (24 hex chars), return it
  if (isObjectId(uuid)) {
    return uuid;
  }
  
  // Otherwise, look up in the mapping
  return idMappingCache.get(uuid) || null;
}

/**
 * Get the UUID for a MongoDB ObjectId
 * @returns The UUID or null if mapping doesn't exist
 */
export function getUuidFromObjectId(objectId: string): string | null {
  // If the ID is already a UUID, return it
  if (isUuid(objectId)) {
    return objectId;
  }
  
  // Otherwise, look up in the mapping
  return idMappingCache.get(objectId) || null;
}

/**
 * Store a batch of ID mappings from strain data
 */
export function storeBatchMappings(
  strains: Array<{id?: string; uuid?: string; originalId?: string; objectId?: string}>
): void {
  for (const strain of strains) {
    const uuid = strain.uuid || strain.id;
    const objectId = strain.objectId || strain.originalId;
    
    if (uuid && objectId) {
      storeIdMapping(uuid, objectId);
    }
  }
}

/**
 * Checks if an ID is in MongoDB ObjectId format (24 hex chars)
 */
export function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

/**
 * Checks if an ID is in UUID format
 */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}