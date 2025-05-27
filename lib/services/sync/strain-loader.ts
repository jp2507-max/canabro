/**
 * Shared utility for loading strain data from WatermelonDB
 * Maintains DRY principles by centralizing strain loading logic used in multiple files
 */

import { Database } from '@nozbe/watermelondb';

// Type definitions for better type safety
export interface StrainObject {
  id: string;
  name: string;
  type?: string;
  genetics?: string;
  description?: string;
  thc_content?: number;
  cbd_content?: number;
  flowering_time?: number;
  yield_indoor?: string;
  yield_outdoor?: string;
  difficulty?: string;
  effects?: string[];
  flavors?: string[];
  medical_uses?: string[];
  created_at?: string;
  updated_at?: string;
}

// WatermelonDB model interface
interface StrainModel {
  id: string;
  name: string;
  type?: string;
  genetics?: string;
  description?: string;
  thc_content?: number;
  cbd_content?: number;
  flowering_time?: number;
  yield_indoor?: string;
  yield_outdoor?: string;
  difficulty?: string;
  effects?: string[] | string;
  flavors?: string[] | string;
  medical_uses?: string[] | string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Utility function to convert a WatermelonDB strain model to a plain object
 * 
 * @param strainData The WatermelonDB strain model
 * @returns A plain JavaScript object with the strain data
 */
function convertToStrainObject(strainData: StrainModel): StrainObject {
  /**
   * Helper function to safely parse JSON string arrays back to actual arrays
   * This aligns with the SYNC_ARRAY_FIX to ensure arrays remain as arrays for Supabase
   */
  const parseJsonStringToArray = (value: any): string[] | undefined => {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch (error) {
        // If parsing fails, treat as comma-separated string and split
        return value.split(',').map(item => item.trim()).filter(Boolean);
      }
    }
    return undefined;
  };

  return {
    id: strainData.id,
    name: strainData.name,
    type: strainData.type,
    genetics: strainData.genetics,
    description: strainData.description,
    thc_content: strainData.thc_content,
    cbd_content: strainData.cbd_content,
    flowering_time: strainData.flowering_time,
    yield_indoor: strainData.yield_indoor,
    yield_outdoor: strainData.yield_outdoor,
    difficulty: strainData.difficulty,
    effects: parseJsonStringToArray(strainData.effects),
    flavors: parseJsonStringToArray(strainData.flavors),
    medical_uses: parseJsonStringToArray(strainData.medical_uses),
    created_at: strainData.created_at,
    updated_at: strainData.updated_at,
  };
}

/**
 * Loads a strain from WatermelonDB by its ID
 * 
 * @param database The WatermelonDB database instance
 * @param strainId The ID of the strain to load
 * @returns The strain as a StrainObject or null if not found
 */
export async function loadStrainFromDatabase(
  database: Database, 
  strainId: string
): Promise<StrainObject | null> {
  try {
    const strainsCollection = database.collections.get('strains');
    
    if (!strainsCollection) {
      throw new Error('[Strain Loader] Strains collection not found in database');
    }
    
    const strain = await strainsCollection.find(strainId);
    
    // Assuming 'strain' (a WatermelonDB Model) has the properties of StrainModel
    return convertToStrainObject(strain as unknown as StrainModel);  } catch (error) {
    // Handle record not found errors more reliably
    // WatermelonDB throws various error messages for missing records, so we check multiple patterns
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Check for common WatermelonDB "not found" error patterns
      const isNotFoundError = 
        errorMessage.includes('not found') ||
        errorMessage.includes('record was not found') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('no record') ||
        (error.name && error.name === 'RecordNotFoundError');
      
      if (isNotFoundError) {
        return null;
      }
    }
    
    // Log unexpected errors for debugging
    console.error('[Strain Loader] Unexpected error loading strain from database:', error);
    throw error; // Rethrow unexpected errors
  }
}

/**
 * Loads all strains from WatermelonDB
 * 
 * @param database The WatermelonDB database instance
 * @returns An array of StrainObjects
 */
export async function loadAllStrainsFromDatabase(
  database: Database
): Promise<StrainObject[]> {
  try {
    const strainsCollection = database.collections.get('strains');
    
    if (!strainsCollection) {
      throw new Error('[Strain Loader] Strains collection not found in database');
    }
    
    const allStrains = await strainsCollection.query().fetch();
    return allStrains.map(strain => convertToStrainObject(strain as unknown as StrainModel));
  } catch (error) {
    // console.error('[Strain Loader] Error loading all strains from database:', error);
    throw error;
  }
}
