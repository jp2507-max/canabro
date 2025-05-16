/**
 * StrainSyncService
 * 
 * A service for synchronizing strains between the external API and the local WatermelonDB database.
 * This handles functionality like ensuring strains exist locally before they're referenced.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '../models';
import { Strain } from '../models/Strain';
import { WeedDbService } from './weed-db.service';
import { ensureUuid } from '../utils/uuid';
import { isObjectId, storeIdMapping } from '../utils/strainIdMapping';
import { Strain as ApiStrain } from '../types/weed-db';

/**
 * Finds or creates a strain in the local WatermelonDB database based on API data
 * 
 * @param apiId The external API ID (can be MongoDB ObjectId or UUID)
 * @param strainData The strain data from the API
 * @returns The local Strain model instance or null if failed
 */
export async function findOrCreateLocalStrain(
  apiId: string,
  strainData?: Partial<ApiStrain>
): Promise<Strain | null> {
  try {
    // Normalize the UUID format
    const uuidStrainId = ensureUuid(apiId);
    
    if (!uuidStrainId) {
      console.error('[StrainSyncService] Could not generate UUID for strain ID:', apiId);
      return null;
    }
    
    // Store MongoDB ObjectId mapping if appropriate
    const isMongoId = isObjectId(apiId);
    const strainCollection = database.get<Strain>('strains');
    
    // Step 1: Try to find by api_id first (most accurate match)
    let strain = await strainCollection.query(Q.where('api_id', apiId)).fetch();
    
    // Step 2: If not found by api_id, try by local ID (could be a UUID match)
    if (!strain.length && uuidStrainId) {
      strain = await strainCollection.query(Q.where('id', uuidStrainId)).fetch();
    }
    
    // If strain exists locally, return it
    if (strain.length > 0) {
      console.log('[StrainSyncService] Found existing strain in local database:', strain[0].id);
      return strain[0];
    }
    
    // If no strain data was provided and the strain wasn't found locally, fetch it
    if (!strainData) {
      console.log('[StrainSyncService] Fetching strain data from API for ID:', apiId);
      const apiStrainData = await WeedDbService.getById(apiId);
      
      if (!apiStrainData) {
        console.error('[StrainSyncService] Failed to fetch strain data for ID:', apiId);
        return null;
      }
      
      strainData = apiStrainData;
    }
    
    // Create the strain in WatermelonDB
    console.log('[StrainSyncService] Creating new strain in local database:', {
      apiId,
      name: strainData.name,
      type: strainData.type,
    });
    
    // Ensure we have the minimum required data
    if (!strainData.name) {
      console.error('[StrainSyncService] Strain data missing required fields:', strainData);
      return null;
    }

    // Store the relationship between UUID and MongoDB ObjectID if both exist
    if (isMongoId && uuidStrainId && uuidStrainId !== apiId) {
      storeIdMapping(uuidStrainId, apiId);
      console.log('[StrainSyncService] Stored ID mapping between UUID and ObjectId');
    }
    
    // Create the local strain record
    const newStrain = await database.write(async () => {
      return await strainCollection.create((strain: Strain) => {
        strain.apiId = apiId;
        strain.name = strainData!.name || 'Unknown Strain';
        strain.type = strainData!.type || 'hybrid';
        strain.description = Array.isArray(strainData!.description) 
          ? strainData!.description.join(' ') 
          : strainData!.description;
        strain.imageUrl = strainData!.imageUrl || strainData!.image || '';
        strain.thcContent = typeof strainData!.thc === 'number' ? strainData!.thc : undefined;
        strain.cbdContent = typeof strainData!.cbd === 'number' ? strainData!.cbd : undefined;
        
        // Convert effects and flavors to JSON strings using the helper methods
        if (Array.isArray(strainData!.effects)) {
          strain.setEffects(strainData!.effects);
        }
        
        if (Array.isArray(strainData!.flavors)) {
          strain.setFlavors(strainData!.flavors);
        }
      });
    });
    
    return newStrain;
  } catch (error) {
    console.error('[StrainSyncService] Error finding or creating strain:', error);
    return null;
  }
}

/**
 * Finds a strain in the local database by API ID
 * 
 * @param apiId The external API ID
 * @returns The local strain or null if not found
 */
export async function findLocalStrainByApiId(apiId: string): Promise<Strain | null> {
  try {
    const strainCollection = database.get<Strain>('strains');
    const strains = await strainCollection.query(Q.where('api_id', apiId)).fetch();
    
    return strains.length > 0 ? strains[0] : null;
  } catch (error) {
    console.error('[StrainSyncService] Error finding strain by API ID:', error);
    return null;
  }
}

/**
 * Updates a local strain with data from the API
 * 
 * @param strain The local strain to update
 * @param apiData The API strain data
 * @returns The updated strain or null if failed
 */
export async function updateLocalStrainFromApi(
  strain: Strain, 
  apiData: Partial<ApiStrain>
): Promise<Strain | null> {
  try {
    return await database.write(async () => {
      await strain.update((s) => {
        // Only update fields that are present in the API data
        if (apiData.name) s.name = apiData.name;
        if (apiData.type) s.type = apiData.type;
        if (apiData.description) {
          s.description = Array.isArray(apiData.description) 
            ? apiData.description.join(' ') 
            : apiData.description;
        }
        if (apiData.imageUrl || apiData.image) {
          s.imageUrl = apiData.imageUrl || apiData.image || '';
        }
        if (typeof apiData.thc === 'number') s.thcContent = apiData.thc;
        if (typeof apiData.cbd === 'number') s.cbdContent = apiData.cbd;
        
        // Update effects and flavors if provided
        if (Array.isArray(apiData.effects)) {
          s.setEffects(apiData.effects);
        }
        
        if (Array.isArray(apiData.flavors)) {
          s.setFlavors(apiData.flavors);
        }
      });
      
      return strain;
    });
  } catch (error) {
    console.error('[StrainSyncService] Error updating strain:', error);
    return null;
  }
}
