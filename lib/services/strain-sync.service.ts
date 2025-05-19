/**
 * StrainSyncService
 *
 * A service for synchronizing strains between the external API and the local WatermelonDB database.
 */

// WatermelonDB Imports
import { Q } from '@nozbe/watermelondb';
import database from '../database/database'; // Corrected: default import and path
import { Strain } from '../models/Strain';
import { RawStrainApiResponse } from '../types/weed-db';
import { log } from '../utils/logger';
import {
  sanitizeString,
  parseOptionalNumber,
  parseOptionalStringArray,
  parsePercentageString,
  extractFloweringTime,
  FloweringTimeInWeeks,
} from '../utils/data-parsing'; // Path should be correct relative to services directory

const STRAIN_API_URL = 'https://www.weed.db/api/strains';

/**
 * Prepares raw API data for insertion into the WatermelonDB 'strains' table.
 */
function prepareDataForWatermelonDB(apiStrain: RawStrainApiResponse): any {
  const effectsArray = parseOptionalStringArray(apiStrain.effects);
  const flavorsArray = parseOptionalStringArray(apiStrain.flavors);
  const terpenesArray = parseOptionalStringArray(apiStrain.terpenes);
  const parentsArray = parseOptionalStringArray(apiStrain.parents);
  const originArray = parseOptionalStringArray(apiStrain.origin);

  let descriptionString = null;
  if (Array.isArray(apiStrain.description)) {
    descriptionString = sanitizeString(apiStrain.description.join('\n'));
  } else if (apiStrain.description) {
    descriptionString = sanitizeString(apiStrain.description);
  }

  let imageUrl = null;
  if (apiStrain.image_url) {
    imageUrl = sanitizeString(apiStrain.image_url);
  } else if (apiStrain.imageUrl) {
    imageUrl = sanitizeString(apiStrain.imageUrl);
  } else if (apiStrain.image) {
    imageUrl = sanitizeString(apiStrain.image);
  }

  // Use the new parsing functions for THC, CBD, and flowering time
  const thcPercentage = parsePercentageString(apiStrain.thc || apiStrain.THC);
  const cbdPercentage = parsePercentageString(apiStrain.cbd || apiStrain.CBD);
  
  // Use fromSeedToHarvest as a fallback for floweringTime, similar to Supabase version
  const floweringTimeData: FloweringTimeInWeeks = extractFloweringTime(
    apiStrain.floweringTime || apiStrain.fromSeedToHarvest
  );

  // Prepare data for WatermelonDB, ensuring field names match the WDB Strain model
  const wdbData: Partial<Strain> & { api_id: string; average_yield?: string | null; link?: string | null} = {
    api_id: sanitizeString(apiStrain.api_id),
    name: sanitizeString(apiStrain.name),
    type: apiStrain.type ? sanitizeString(apiStrain.type) : null,
    genetics: apiStrain.genetics ? sanitizeString(apiStrain.genetics) : null,
    description: descriptionString,
    thc_percentage: thcPercentage,
    cbd_percentage: cbdPercentage,
    flowering_time_min_weeks: floweringTimeData.minWeeks,
    flowering_time_max_weeks: floweringTimeData.maxWeeks,
    flowering_type: apiStrain.floweringType ? sanitizeString(apiStrain.floweringType) : null,
    image_url: imageUrl,
    breeder: apiStrain.breeder ? sanitizeString(apiStrain.breeder) : null,
    origin: JSON.stringify(originArray), // Assuming WDB 'origin' is a string field for JSON
    // Combine yieldIndoor and yieldOutdoor into a single string if both exist, or use whichever is available
    // This matches the logic in the Supabase version's prepareStrainDataForSupabase for 'average_yield'
    // Assuming your WatermelonDB 'Strain' model has a field like 'average_yield' or similar to store this combined info.
    // If not, you might need to adjust the model or store them separately.
    // For now, let's assume a field named 'average_yield' exists in the WDB model for this combined string.
    average_yield: apiStrain.yieldIndoor && apiStrain.yieldOutdoor
      ? `Indoor: ${sanitizeString(apiStrain.yieldIndoor)}, Outdoor: ${sanitizeString(apiStrain.yieldOutdoor)}`
      : (sanitizeString(apiStrain.yieldIndoor) || sanitizeString(apiStrain.yieldOutdoor) || null),
    // Storing yields separately as per the schema if average_yield is not the target
    yield_indoor_grams_m2: parseOptionalNumber(apiStrain.yieldIndoor), // Or a more specific parsing if needed
    yield_outdoor_grams_plant: parseOptionalNumber(apiStrain.yieldOutdoor), // Or a more specific parsing if needed
    height_indoor_cm: parseOptionalNumber(apiStrain.heightIndoor), // Or a more specific parsing if needed
    height_outdoor_cm: parseOptionalNumber(apiStrain.heightOutdoor), // Or a more specific parsing if needed
    grow_difficulty: apiStrain.growDifficulty ? sanitizeString(apiStrain.growDifficulty) : null,
    harvest_time_outdoor: apiStrain.harvestTimeOutdoor ? sanitizeString(apiStrain.harvestTimeOutdoor) : null,
    effects: JSON.stringify(effectsArray), // Assuming WDB 'effects' is a string field for JSON
    flavors: JSON.stringify(flavorsArray), // Assuming WDB 'flavors' is a string field for JSON
    terpenes: JSON.stringify(terpenesArray), // Assuming WDB 'terpenes' is a string field for JSON
    parents: JSON.stringify(parentsArray),   // Assuming WDB 'parents' is a string field for JSON
    link: apiStrain.link ? sanitizeString(apiStrain.link) : null,
  };
   // Clean up undefined properties to null, which WatermelonDB handles better.
   Object.keys(wdbData).forEach(key => {
    const k = key as keyof typeof wdbData;
    if (wdbData[k] === undefined) {
      // @ts-ignore - Explicitly setting to null if undefined
      wdbData[k] = null;
    }
  });

  return wdbData;
}

/**
 * Fetches strains from the external API.
 */
export async function fetchStrainsFromApi(limit: number = 20, offset: number = 0): Promise<RawStrainApiResponse[]> {
  try {
    log.info(`Fetching strains from API: limit=${limit}, offset=${offset}`);
    // const apiUrl = new URL(STRAIN_API_URL);
    // apiUrl.searchParams.append('limit', String(limit));
    // apiUrl.searchParams.append('offset', String(offset));
    // const response = await fetch(apiUrl.toString());
    const response = await fetch(STRAIN_API_URL);

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Failed to fetch strains from API', { status: response.status, error: errorText });
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    log.info(`Successfully fetched ${Array.isArray(data) ? data.length : 'a non-array response'} from API`);
    return Array.isArray(data) ? data as RawStrainApiResponse[] : []; // Ensure array return
  } catch (error) {
    log.error('Error fetching strains from API:', error);
    throw error;
  }
}

/**
 * Synchronizes strains from the API with the local WatermelonDB.
 */
export async function syncStrainsWithWatermelonDB(): Promise<void> {
  log.info('Starting strain synchronization with WatermelonDB...');
  try {
    const rawStrainsFromApi = await fetchStrainsFromApi();
    if (!rawStrainsFromApi || rawStrainsFromApi.length === 0) {
      log.info('No strains fetched from API to sync.');
      return;
    }

    const strainsCollection = database.collections.get<Strain>('strains');

    await database.write(async () => {
      for (const rawStrain of rawStrainsFromApi) {
        if (!rawStrain.api_id || !rawStrain.name) {
          log.warn('Skipping strain with missing api_id or name from API:', rawStrain);
          continue;
        }

        const preparedData = prepareDataForWatermelonDB(rawStrain);
        
        try {
          const existingStrains = await strainsCollection
            .query(Q.where('api_id', rawStrain.api_id))
            .fetch();

          if (existingStrains.length > 0) {
            const strainToUpdate = existingStrains[0];
            // Ensure strainToUpdate is not undefined before proceeding
            if (strainToUpdate) {
              log.info(`Updating existing strain in WatermelonDB: ${strainToUpdate.name} (API ID: ${rawStrain.api_id})`);
              await strainToUpdate.update(record => {
                // Assign properties from preparedData to the record
                // The 'record' parameter in the update callback is the model instance
                Object.keys(preparedData).forEach(key => {
                  // @ts-ignore // Allow dynamic assignment, assuming keys match model fields
                  record[key] = preparedData[key];
                });
              });
            } else {
              log.warn(`Strain with API ID: ${rawStrain.api_id} found in query but was undefined unexpectedly.`);
            }
          } else {
            log.info(`Creating new strain in WatermelonDB: ${preparedData.name} (API ID: ${rawStrain.api_id})`);
            await strainsCollection.create(record => {
              // Assign properties from preparedData to the new record
              Object.keys(preparedData).forEach(key => {
                // @ts-ignore // Allow dynamic assignment
                record[key] = preparedData[key];
              });
            });
          }
        } catch (dbError) {
          log.error(`Error processing strain (API ID: ${rawStrain.api_id}, Name: ${rawStrain.name}) for WatermelonDB:`, dbError);
        }
      }
    });
    log.info('Strain synchronization with WatermelonDB completed.');
  } catch (error) {
    log.error('Error during strain synchronization with WatermelonDB:', error);
  }
}

/**
 * Retrieves all strains from WatermelonDB.
 */
export async function getAllStrainsFromWatermelonDB(): Promise<Strain[]> {
  try {
    log.info('Fetching all strains from WatermelonDB...');
    const strainsCollection = database.collections.get<Strain>('strains');
    const strains = await strainsCollection.query().fetch();
    log.info(`Retrieved ${strains.length} strains from WatermelonDB.`);
    return strains;
  } catch (error) {
    log.error('Error fetching all strains from WatermelonDB:', error);
    return [];
  }
}

/**
 * Searches for strains in WatermelonDB by name (case-insensitive).
 */
export async function searchStrainsInWatermelonDB(query: string): Promise<Strain[]> {
  if (!query || query.trim() === '') {
    return getAllStrainsFromWatermelonDB();
  }
  try {
    const lowerCaseQuery = query.toLowerCase();
    log.info(`Searching for strains in WatermelonDB with query: "${lowerCaseQuery}"`);
    const strainsCollection = database.collections.get<Strain>('strains');
    const allStrains = await strainsCollection.query().fetch();
    const filteredStrains = allStrains.filter(strain =>
      strain.name.toLowerCase().includes(lowerCaseQuery)
    );
    log.info(`Found ${filteredStrains.length} strains matching "${query}".`);
    return filteredStrains;
  } catch (error) {
    log.error(`Error searching strains in WatermelonDB with query "${query}":`, error);
    return [];
  }
}

/**
 * Retrieves a specific strain by its WatermelonDB ID.
 */
export async function getStrainByIdFromWatermelonDB(id: string): Promise<Strain | null> {
  try {
    log.info(`Fetching strain by WatermelonDB ID: ${id}`);
    const strainsCollection = database.collections.get<Strain>('strains');
    const strain = await strainsCollection.find(id);
    log.info(strain ? `Found strain: ${strain.name}` : 'Strain not found.');
    return strain;
  } catch (error) {
    log.warn(`Strain with WatermelonDB ID ${id} not found or error fetching:`, error);
    return null;
  }
}

/**
 * Retrieves strains by type (e.g., 'indica', 'sativa', 'hybrid') (case-insensitive).
 */
export async function getStrainsByTypeFromWatermelonDB(type: string): Promise<Strain[]> {
  if (!type || type.trim() === '') {
    log.warn('Attempted to fetch strains by empty type.');
    return [];
  }
  try {
    const lowerCaseType = type.toLowerCase();
    log.info(`Fetching strains by type: "${lowerCaseType}" from WatermelonDB.`);
    const strainsCollection = database.collections.get<Strain>('strains');
    const allStrains = await strainsCollection.query().fetch();
    const filteredStrains = allStrains.filter(strain =>
      strain.type && strain.type.toLowerCase() === lowerCaseType
    );
    log.info(`Found ${filteredStrains.length} strains of type "${type}".`);
    return filteredStrains;
  } catch (error) {
    log.error(`Error fetching strains by type "${type}" from WatermelonDB:`, error);
    return [];
  }
}

// Additional WatermelonDB specific utility functions can be added here as needed.
// For example, functions to count strains, get strains with specific criteria, etc.
