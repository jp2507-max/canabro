/**
 * StrainSyncService
 *
 * A service for synchronizing strains between the external API and the local WatermelonDB database.
 */

// WatermelonDB Imports
import { Q } from '@nozbe/watermelondb';

import { WeedDbService } from '../weed-db.service'; // Import the existing service
import { RAPIDAPI_KEY, RAPIDAPI_HOST } from '../../config'; // Import API configuration
import database from '../../database/database';
import { Strain as WDBStrainModel } from '../../models/Strain'; // Corrected: Aliased import
import supabase from '../../supabase'; // Import the supabase client
import { SupabaseStrain } from '../../types/supabase'; // Added import
import { RawStrainApiResponse } from '../../types/weed-db';
import {
  sanitizeString,
  parseOptionalNumber,
  parseOptionalStringArray,
  parsePercentageString,
} from '../../utils/data-parsing'; // Corrected path
import { log } from '../../utils/logger';
import { Strain } from '../../types/strain';
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */ // Legacy code needs flexible typings

// Use The Weed DB API on RapidAPI
const STRAIN_API_URL = 'https://the-weed-db.p.rapidapi.com';

/**
 * Prepares raw API data for insertion into the WatermelonDB 'strains' table.
 */
export function prepareDataForWatermelonDB(
  apiStrain: RawStrainApiResponse
): Partial<WDBStrainModel> & { api_id: string } {
  // Corrected: Use WDBStrainModel
  const effectsArray = parseOptionalStringArray(apiStrain.effects);
  const flavorsArray = parseOptionalStringArray(apiStrain.flavors);
  const terpenesArray = parseOptionalStringArray(apiStrain.terpenes);
  const parentsArray = parseOptionalStringArray(apiStrain.parents);
  const originArray = parseOptionalStringArray(apiStrain.origin); // Assuming origin can be an array of strings
  let descriptionString = null;
  if (Array.isArray(apiStrain.description)) {
    descriptionString = sanitizeString(apiStrain.description.join('\n'));
  } else if (apiStrain.description) {
    descriptionString = sanitizeString(apiStrain.description);
  }
  // descriptionString is potentially: string | null

  const thcPercentage = parsePercentageString((apiStrain.thc || apiStrain.THC) as string | number | null | undefined); // is: number | null
  const cbdPercentage = parsePercentageString((apiStrain.cbd || apiStrain.CBD) as string | number | null | undefined); // is: number | null

  // Parse floweringTime as a single number. Assumes API provides it as a string like "10 weeks" or a direct number.
  // The parseOptionalNumber function will attempt to extract a number from the string.
  const floweringTime = parseOptionalNumber(apiStrain.floweringTime || apiStrain.fromSeedToHarvest); // is: number | null

  const wdbData: Partial<WDBStrainModel> & { api_id: string } = {
    // Corrected: Use WDBStrainModel
    api_id: sanitizeString(apiStrain.api_id), // Assuming api_id is required and sanitizeString returns string for valid input
    name: sanitizeString(apiStrain.name), // Assuming name is required and sanitizeString returns string for valid input
    type: (apiStrain.type ? sanitizeString(apiStrain.type) : null) ?? undefined,
    description: descriptionString ?? undefined,
    thcPercentage: thcPercentage ?? undefined,
    cbdPercentage: cbdPercentage ?? undefined,
    floweringTime: floweringTime ?? undefined,
    growDifficulty:
      (apiStrain.growDifficulty ? sanitizeString(apiStrain.growDifficulty) : null) ?? undefined,
    effects: effectsArray ? JSON.stringify(effectsArray) : undefined,
    flavors: flavorsArray ? JSON.stringify(flavorsArray) : undefined,
    terpenes: terpenesArray ? JSON.stringify(terpenesArray) : undefined,
    parents: parentsArray ? JSON.stringify(parentsArray) : undefined,
    origin: originArray ? JSON.stringify(originArray) : undefined, // Storing as JSON string or undefined
    genetics: (apiStrain.genetics ? sanitizeString(apiStrain.genetics) : null) ?? undefined,
    floweringType:
      (apiStrain.floweringType ? sanitizeString(apiStrain.floweringType) : null) ?? undefined,
    heightIndoor:
      (apiStrain.heightIndoor != null ? sanitizeString(String(apiStrain.heightIndoor)) : null) ??
      undefined,
    heightOutdoor:
      (apiStrain.heightOutdoor != null ? sanitizeString(String(apiStrain.heightOutdoor)) : null) ??
      undefined,
    averageYield:
      (apiStrain.average_yield != null ? sanitizeString(String(apiStrain.average_yield)) : null) ??
      undefined,
    yieldIndoor:
      (apiStrain.yieldIndoor ? sanitizeString(apiStrain.yieldIndoor) : null) ?? undefined,
    yieldOutdoor:
      (apiStrain.yieldOutdoor ? sanitizeString(apiStrain.yieldOutdoor) : null) ?? undefined,
    harvestTimeOutdoor:
      (apiStrain.harvestTimeOutdoor ? sanitizeString(apiStrain.harvestTimeOutdoor) : null) ??
      undefined,
    link: (apiStrain.link ? sanitizeString(apiStrain.link) : null) ?? undefined,
  };

  // Clean up undefined properties to null, which WatermelonDB handles better.
  Object.keys(wdbData).forEach((key) => {
    const k = key as keyof typeof wdbData;
    // @ts-ignore - wdbData[k] can be undefined here before assignment
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
export async function fetchStrainsFromApi(
  limit: number = 20,
  offset: number = 0
): Promise<RawStrainApiResponse[]> {
  try {
    log.info(`Fetching strains from API: limit=${limit}, offset=${offset}`);

    // Validate API credentials are available
    if (!RAPIDAPI_KEY) {
      throw new Error(
        'RapidAPI key is missing. Please set RAPIDAPI_KEY in your environment variables.'
      );
    }
    if (!RAPIDAPI_HOST) {
      throw new Error(
        'RapidAPI host is missing. Please set RAPIDAPI_HOST in your environment variables.'
      );
    }

    const apiUrl = `${STRAIN_API_URL}?limit=${limit}&offset=${offset}`;
    const response = await fetch(apiUrl, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Failed to fetch strains from API', { status: response.status, error: errorText });
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    log.info(
      `Successfully fetched ${Array.isArray(data) ? data.length : 'a non-array response'} from API`
    );
    return Array.isArray(data) ? (data as RawStrainApiResponse[]) : []; // Ensure array return
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

    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel

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
            if (strainToUpdate) {
              log.info(
                `Updating existing strain in WatermelonDB: ${strainToUpdate.name} (API ID: ${rawStrain.api_id})`
              );
              await strainToUpdate.update((record: WDBStrainModel) => {
                // Corrected: Add type to record
                Object.keys(preparedData).forEach((key) => {
                  // @ts-ignore
                  record[key] = preparedData[key as keyof typeof preparedData];
                });
              });
            } else {
              log.warn(
                `Strain with API ID: ${rawStrain.api_id} found in query but was undefined unexpectedly.`
              );
            }
          } else {
            log.info(
              `Creating new strain in WatermelonDB: ${preparedData.name} (API ID: ${rawStrain.api_id})`
            );
            await strainsCollection.create((record: WDBStrainModel) => {
              // Corrected: Add type to record
              Object.keys(preparedData).forEach((key) => {
                // @ts-ignore
                record[key] = preparedData[key as keyof typeof preparedData];
              });
            });
          }
        } catch (dbError) {
          log.error(
            `Error processing strain (API ID: ${rawStrain.api_id}, Name: ${rawStrain.name}) for WatermelonDB:`,
            dbError
          );
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
export async function getAllStrainsFromWatermelonDB(): Promise<WDBStrainModel[]> {
  // Corrected: Use WDBStrainModel
  try {
    log.info('Fetching all strains from WatermelonDB...');
    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel
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
export async function searchStrainsInWatermelonDB(query: string): Promise<WDBStrainModel[]> {
  // Corrected: Use WDBStrainModel
  if (!query || query.trim() === '') {
    return getAllStrainsFromWatermelonDB();
  }
  try {
    const trimmedQuery = query.trim();
    log.info(`Searching for strains in WatermelonDB with query: "${trimmedQuery}"`);
    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel
    
    // Optimize with database-level filtering for exact matches first
    // Try exact match for optimal performance
    const exactMatch = await strainsCollection
      .query(Q.where('name', trimmedQuery))
      .fetch();
    
    if (exactMatch.length > 0) {
      log.info(`Found ${exactMatch.length} exact matches for "${query}".`);
      return exactMatch;
    }
    
    // Try case variations for exact matches using database queries
    const caseVariations = [
      trimmedQuery.toLowerCase(),
      trimmedQuery.toUpperCase(),
      trimmedQuery.charAt(0).toUpperCase() + trimmedQuery.slice(1).toLowerCase()
    ];
    
    for (const variation of caseVariations) {
      if (variation !== trimmedQuery) { // Avoid duplicate query
        const variantMatch = await strainsCollection
          .query(Q.where('name', variation))
          .fetch();
        if (variantMatch.length > 0) {
          log.info(`Found ${variantMatch.length} case-variant matches for "${query}".`);
          return variantMatch;
        }
      }
    }
    
    // Fall back to partial string matching (in-memory filtering)
    // Note: WatermelonDB doesn't support LIKE operations for database-level partial matching
    log.info(`No exact matches found, falling back to partial string search for "${query}"`);
    const lowerCaseQuery = trimmedQuery.toLowerCase();
    const allStrains = await strainsCollection.query().fetch();
    const filteredStrains = allStrains.filter((strain) =>
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
export async function getStrainByIdFromWatermelonDB(id: string): Promise<WDBStrainModel | null> {
  // Corrected: Use WDBStrainModel
  try {
    log.info(`Fetching strain by WatermelonDB ID: ${id}`);
    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel
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
export async function getStrainsByTypeFromWatermelonDB(type: string): Promise<WDBStrainModel[]> {
  // Corrected: Use WDBStrainModel
  if (!type || type.trim() === '') {
    log.warn('Attempted to fetch strains by empty type.');
    return [];
  }
  try {
    const lowerCaseType = type.toLowerCase();
    log.info(`Fetching strains by type: "${lowerCaseType}" from WatermelonDB.`);
    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel
    
    // Use WatermelonDB query filtering instead of in-memory filtering for better performance
    // Handle case-insensitive matching by checking common variations
    const typeVariations = [
      type.toLowerCase(),
      type.toUpperCase(), 
      type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() // Title case
    ];
    
    const filteredStrains = await strainsCollection
      .query(Q.where('type', Q.oneOf(typeVariations)))
      .fetch();
      
    log.info(`Found ${filteredStrains.length} strains of type "${type}".`);
    return filteredStrains;
  } catch (error) {
    log.error(`Error fetching strains by type "${type}" from WatermelonDB:`, error);
    return [];
  }
}

// Helper function to parse JSON string arrays safely
function parseJsonStringToArraySafe(jsonString: string | undefined | null): string[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    log.warn('Failed to parse JSON string to array:', jsonString, error);
    return [];
  }
}

// Helper function to ensure a value is a string or null
function ensureStringOrNull(value: any): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function convertWdbStrainToRawApi(wdbStrain: WDBStrainModel): RawStrainApiResponse {
  const rawApiResponse: RawStrainApiResponse = {
    api_id: (wdbStrain as any).api_id ?? (wdbStrain as any).apiId ?? '',
    name: wdbStrain.name,
    type: ensureStringOrNull(wdbStrain.type),
    description: ensureStringOrNull(wdbStrain.description),
    thc:
      wdbStrain.thcPercentage !== null && wdbStrain.thcPercentage !== undefined
        ? wdbStrain.thcPercentage.toString()
        : null,
    cbd:
      wdbStrain.cbdPercentage !== null && wdbStrain.cbdPercentage !== undefined
        ? wdbStrain.cbdPercentage.toString()
        : null,
    floweringTime:
      wdbStrain.floweringTime !== null && wdbStrain.floweringTime !== undefined
        ? wdbStrain.floweringTime.toString()
        : null,
    growDifficulty: ensureStringOrNull(wdbStrain.growDifficulty),
    effects: parseJsonStringToArraySafe(wdbStrain.effects),
    flavors: parseJsonStringToArraySafe(wdbStrain.flavors),
    terpenes: parseJsonStringToArraySafe(wdbStrain.terpenes),
    parents: parseJsonStringToArraySafe(wdbStrain.parents),
    origin: parseJsonStringToArraySafe(wdbStrain.origin),
    genetics: ensureStringOrNull(wdbStrain.genetics),
    floweringType: ensureStringOrNull(wdbStrain.floweringType),
    heightIndoor: ensureStringOrNull(wdbStrain.heightIndoor),
    heightOutdoor: ensureStringOrNull(wdbStrain.heightOutdoor),
    average_yield: ensureStringOrNull(wdbStrain.averageYield),
    yieldIndoor: ensureStringOrNull(wdbStrain.yieldIndoor),
    yieldOutdoor: ensureStringOrNull(wdbStrain.yieldOutdoor),
    harvestTimeOutdoor: ensureStringOrNull(wdbStrain.harvestTimeOutdoor),
    link: ensureStringOrNull(wdbStrain.link),
    fromSeedToHarvest: null,
    aliases: [],
    seed_company: null,
    rating: null,
    reviews_count: null,
    images: [],
    url: ensureStringOrNull(wdbStrain.link),
    symptoms: [],
    ailments: [],
    top_terpene: null,
    terpene_profile: {},
    cannabinoid_profile: {},
    user_submitted: false,
    published_at: null,
    is_active: true,
  };

  Object.keys(rawApiResponse).forEach((keyStr) => {
    const key = keyStr as keyof RawStrainApiResponse;
    if (rawApiResponse[key] === undefined) {
      // @ts-ignore
      rawApiResponse[key] = null;
    }
  });

  return rawApiResponse;
}

export function convertSupabaseStrainToRawApi(
  supabaseStrain: SupabaseStrain
): RawStrainApiResponse {
  const rawApiResponse: RawStrainApiResponse = {
    api_id: supabaseStrain.api_id || '',
    name: supabaseStrain.name,
    type: ensureStringOrNull(supabaseStrain.type),
    description: ensureStringOrNull(supabaseStrain.description),
    thc:
      supabaseStrain.thc_percentage !== null && supabaseStrain.thc_percentage !== undefined
        ? supabaseStrain.thc_percentage.toString()
        : null,
    cbd:
      supabaseStrain.cbd_percentage !== null && supabaseStrain.cbd_percentage !== undefined
        ? supabaseStrain.cbd_percentage.toString()
        : null,
    floweringTime:
      supabaseStrain.flowering_time !== null && supabaseStrain.flowering_time !== undefined
        ? supabaseStrain.flowering_time.toString()
        : null,
    growDifficulty: ensureStringOrNull(supabaseStrain.grow_difficulty),
    effects: Array.isArray(supabaseStrain.effects) ? supabaseStrain.effects.map(String) : [],
    flavors: Array.isArray(supabaseStrain.flavors) ? supabaseStrain.flavors.map(String) : [],
    genetics: ensureStringOrNull(supabaseStrain.genetics),
    floweringType: ensureStringOrNull(supabaseStrain.flowering_type),
    heightIndoor: ensureStringOrNull(supabaseStrain.height_indoor),
    heightOutdoor: ensureStringOrNull(supabaseStrain.height_outdoor),
    average_yield: ensureStringOrNull(supabaseStrain.average_yield),
    yieldIndoor: ensureStringOrNull(supabaseStrain.yield_indoor),
    yieldOutdoor: ensureStringOrNull(supabaseStrain.yield_outdoor),
    harvestTimeOutdoor: ensureStringOrNull(supabaseStrain.harvest_time_outdoor),
    link: ensureStringOrNull(supabaseStrain.link),
    fromSeedToHarvest: null,
    aliases: [],
    seed_company: null,
    rating: null,
    reviews_count: null,
    images: [],
    url: ensureStringOrNull(supabaseStrain.link),
    symptoms: [],
    ailments: [],
    top_terpene: null,
    terpene_profile: {},
    cannabinoid_profile: {},
    user_submitted: false,
    published_at: null,
    is_active: true,
  };

  Object.keys(rawApiResponse).forEach((keyStr) => {
    const key = keyStr as keyof RawStrainApiResponse;
    if (rawApiResponse[key] === undefined) {
      // @ts-ignore
      rawApiResponse[key] = null;
    }
  });

  return rawApiResponse;
}

/**
 * Searches for strains in Supabase by name (case-insensitive).
 */
export async function searchStrainsInSupabase(
  query: string,
  limit: number = 10
): Promise<SupabaseStrain[]> {
  if (!query || query.trim() === '') {
    log.info('Supabase search query is empty, returning no results.');
    return [];
  }
  try {
    const lowerCaseQuery = query.toLowerCase();
    log.info(`Searching for strains in Supabase with query: "${lowerCaseQuery}", limit: ${limit}`);

    const { data, error } = await supabase
      .from('strains')
      .select('*') // Select all columns
      .ilike('name', `%${lowerCaseQuery}%`) // Case-insensitive search for name
      .limit(limit);

    if (error) {
      log.error('Error searching strains in Supabase:', error);
      return [];
    }

    log.info(`Found ${data?.length || 0} strains in Supabase matching "${query}".`);
    return data || [];
  } catch (error) {
    log.error(`Unexpected error searching strains in Supabase with query "${query}":`, error);
    return [];
  }
}

// Helper function to ensure strain has a valid api_id
function ensureStrainApiId(strain: any): string {
  // Use existing api_id if available
  if (strain.api_id && typeof strain.api_id === 'string' && strain.api_id.trim() !== '') {
    return strain.api_id.trim();
  }

  // Use _id as fallback (MongoDB style)
  if (strain._id && typeof strain._id === 'string' && strain._id.trim() !== '') {
    return strain._id.trim();
  }

  // Use id as fallback
  if (strain.id && typeof strain.id === 'string' && strain.id.trim() !== '') {
    return strain.id.trim();
  }

  // Generate one based on name and timestamp as last resort
  const timestamp = Date.now();
  const nameSlug = strain.name ? strain.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'unknown';
  return `external_${nameSlug}_${timestamp}`;
}

/**
 * Fetches strains from the external API by query.
 * Uses the existing WeedDbService which is properly configured for RapidAPI.
 */
export async function fetchStrainsFromApiByQuery(
  query: string,
  limit: number = 10
): Promise<RawStrainApiResponse[]> {
  if (!query || query.trim() === '') {
    log.info('External API search query is empty, returning no results.');
    return [];
  }
  try {
    log.info(`Fetching strains from external API by query: "${query}", limit: ${limit}`);

    // Use the existing WeedDbService which is already configured for RapidAPI
    const { data: apiData, error } = await WeedDbService.searchByName(query.trim());

    if (error) {
      log.error('External API search error', error);
      return [];
    }

    if (!apiData || apiData.length === 0) {
      log.info(`No strains found in external API for query "${query}"`);
      return [];
    }

    // Convert WeedDbService results to our expected RawStrainApiResponse format
    const convertedStrains = apiData.slice(0, limit).map((strain: any) => {
      const apiId = ensureStrainApiId(strain);

      // Parse type from genetics field (e.g., "Indica/sativa (50/50)" -> "hybrid")
      let type = null;
      if (strain.genetics) {
        const genetics = strain.genetics.toLowerCase();
        if (genetics.includes('indica') && genetics.includes('sativa')) {
          type = 'hybrid';
        } else if (genetics.includes('indica')) {
          type = 'indica';
        } else if (genetics.includes('sativa')) {
          type = 'sativa';
        }
      }

      // Join description array if it's an array
      let description = null;
      if (Array.isArray(strain.description)) {
        description = strain.description.join('\n\n');
      } else if (strain.description) {
        description = strain.description;
      }

      return {
        api_id: apiId,
        name: strain.name || 'Unknown',
        type,
        description,
        effects: strain.effect
          ? String(strain.effect)
              .split(',')
              .map((s) => s.trim())
          : null, // API uses 'effect' not 'effects'
        flavors: strain.smellAndFlavour
          ? String(strain.smellAndFlavour)
              .split(',')
              .map((s) => s.trim())
          : null, // API uses 'smellAndFlavour'
        thc: strain.THC || null, // API uses 'THC'
        cbd: strain.CBD || null, // API uses 'CBD'
        genetics: strain.genetics || null,
        parents: null, // Not provided by this API
        terpenes: null, // Not provided by this API
        origin: null, // Not provided by this API
        floweringTime: strain.floweringTime || null,
        growDifficulty: strain.growDifficulty || null,
        link: strain.link || strain.imageUrl || null,
        // Additional fields from the API
        floweringType: strain.floweringType || null,
        harvestTimeOutdoor: strain.harvestTimeOutdoor || null,
        yieldIndoor: strain.yieldIndoor || null,
        yieldOutdoor: strain.yieldOutdoor || null,
        heightIndoor: strain.heightIndoor || null,
        heightOutdoor: strain.heightOutdoor || null,
      };
    });

    log.info(
      `Successfully fetched ${convertedStrains.length} strains from external API for query "${query}"`
    );
    return convertedStrains;
  } catch (error) {
    log.error(`Error fetching strains from external API by query "${query}":`, error);
    // Do not re-throw, return empty array to allow other search layers to function
    return [];
  }
}

/**
 * Searches for strains across WatermelonDB, then Supabase, then an external API.
 * Merges results and ensures no duplicates based on api_id.
 */
export async function searchStrainsMultiLayered(
  query: string,
  limit: number = 10
): Promise<RawStrainApiResponse[]> {
  log.info(`Starting multi-layered strain search for query: "${query}", limit: ${limit}`);
  const combinedResults: RawStrainApiResponse[] = [];
  const foundApiIds = new Set<string>();

  // 1. Search in WatermelonDB
  try {
    const wdbResults = await searchStrainsInWatermelonDB(query);
    log.info(`Found ${wdbResults.length} results in WatermelonDB for "${query}".`);
    wdbResults.forEach((wdbStrain) => {
      const apiId = (wdbStrain as any).api_id ?? (wdbStrain as any).apiId;
      if (apiId && !foundApiIds.has(apiId)) {
        combinedResults.push(convertWdbStrainToRawApi(wdbStrain));
        foundApiIds.add(apiId);
      }
    });
  } catch (error) {
    log.error('Error searching WatermelonDB in multi-layered search:', error);
  }

  if (combinedResults.length >= limit) {
    log.info('Limit reached after WatermelonDB search.');
    return combinedResults.slice(0, limit);
  }

  // 2. Search in Supabase (if needed)
  try {
    const supabaseResults = await searchStrainsInSupabase(query, limit - combinedResults.length);
    log.info(`Found ${supabaseResults.length} results in Supabase for "${query}".`);
    supabaseResults.forEach((sbStrain) => {
      if (sbStrain.api_id && !foundApiIds.has(sbStrain.api_id)) {
        combinedResults.push(convertSupabaseStrainToRawApi(sbStrain));
        foundApiIds.add(sbStrain.api_id);
      }
    });
  } catch (error) {
    log.error('Error searching Supabase in multi-layered search:', error);
  }

  if (combinedResults.length >= limit) {
    log.info('Limit reached after Supabase search.');
    return combinedResults.slice(0, limit);
  }

  // 3. Search in External API (if needed)
  try {
    const apiResults = await fetchStrainsFromApiByQuery(query, limit - combinedResults.length);
    log.info(`Found ${apiResults.length} results from External API for "${query}".`);
    apiResults.forEach((apiStrain) => {
      if (apiStrain.api_id && !foundApiIds.has(apiStrain.api_id)) {
        // Corrected: Added missing closing parenthesis
        combinedResults.push(apiStrain);
        foundApiIds.add(apiStrain.api_id);
      }
    });
  } catch (error) {
    log.error('Error searching External API in multi-layered search:', error);
  }

  log.info(
    `Multi-layered search completed. Total unique results: ${combinedResults.length} for query "${query}".`
  );
  return combinedResults.slice(0, limit);
}

// Additional WatermelonDB specific utility functions can be added here as needed.
// For example, functions to count strains, get strains with specific criteria, etc.

/**
 * Prepares raw API data for insertion or update into the Supabase 'strains' table.
 */
export function prepareDataForSupabase(
  apiStrain: RawStrainApiResponse
): Partial<SupabaseStrain> & { api_id: string } {
  // Validate required fields
  if (!apiStrain.api_id) {
    throw new Error('api_id is required for Supabase strain preparation');
  }

  if (!apiStrain.name) {
    throw new Error('name is required for Supabase strain preparation');
  }

  log.info(
    `[prepareDataForSupabase] Preparing strain data for Supabase: ${apiStrain.name} (API ID: ${apiStrain.api_id})`
  );

  const effectsArray = parseOptionalStringArray(apiStrain.effects);
  const flavorsArray = parseOptionalStringArray(apiStrain.flavors);

  let descriptionString: string | null = null;
  if (Array.isArray(apiStrain.description)) {
    descriptionString = sanitizeString(apiStrain.description.join('\n\n'));
  } else if (apiStrain.description) {
    descriptionString = sanitizeString(apiStrain.description);
  }

  // Better parsing for THC/CBD - handle formats like "14-19%" and "Unknown"
  const thcPercentage = parsePercentageString((apiStrain.thc || apiStrain.THC) as string | number | null | undefined);
  const cbdPercentage = parsePercentageString((apiStrain.cbd || apiStrain.CBD) as string | number | null | undefined);
  const floweringTime = parseOptionalNumber(apiStrain.floweringTime || apiStrain.fromSeedToHarvest);
  const supabaseData: Partial<SupabaseStrain> & { api_id: string } = {
    api_id: sanitizeString(apiStrain.api_id) || apiStrain.api_id.trim(),
    name: sanitizeString(apiStrain.name) ?? undefined,
    type: apiStrain.type ? sanitizeString(apiStrain.type) : null,
    description: descriptionString,
    thc_percentage: thcPercentage,
    cbd_percentage: cbdPercentage,
    flowering_time: floweringTime,
    grow_difficulty: apiStrain.growDifficulty ? sanitizeString(apiStrain.growDifficulty) : null,
    effects: effectsArray,
    flavors: flavorsArray,
    genetics: apiStrain.genetics ? sanitizeString(apiStrain.genetics) : null,
    flowering_type: apiStrain.floweringType ? sanitizeString(apiStrain.floweringType) : null,
    height_indoor:
      apiStrain.heightIndoor != null ? sanitizeString(String(apiStrain.heightIndoor)) : null,
    height_outdoor:
      apiStrain.heightOutdoor != null ? sanitizeString(String(apiStrain.heightOutdoor)) : null,
    average_yield:
      apiStrain.average_yield != null ? sanitizeString(String(apiStrain.average_yield)) : null,
    yield_indoor: apiStrain.yieldIndoor ? sanitizeString(apiStrain.yieldIndoor) : null,
    yield_outdoor: apiStrain.yieldOutdoor ? sanitizeString(apiStrain.yieldOutdoor) : null,
    harvest_time_outdoor: apiStrain.harvestTimeOutdoor
      ? sanitizeString(apiStrain.harvestTimeOutdoor)
      : null,
    link: apiStrain.link ? sanitizeString(apiStrain.link) : null,
  };

  // Clean up undefined properties to null for Supabase
  Object.keys(supabaseData).forEach((key) => {
    const k = key as keyof typeof supabaseData;
    // @ts-ignore
    if (supabaseData[k] === undefined) {
      // @ts-ignore
      supabaseData[k] = null;
    }
  });

  log.info(`[prepareDataForSupabase] Prepared Supabase data:`, {
    api_id: supabaseData.api_id,
    name: supabaseData.name,
    type: supabaseData.type,
    effects_count: supabaseData.effects?.length || 0,
    flavors_count: supabaseData.flavors?.length || 0,
  });

  return supabaseData;
}

/**
 * Ensures a strain exists in Supabase. If it exists (by api_id), it updates it. Otherwise, it creates it.
 * Returns the Supabase internal ID (uuid) of the strain.
 */
export async function ensureStrainInSupabase(
  preparedSupabaseData: Partial<SupabaseStrain> & { api_id: string }
): Promise<string | null> {
  if (!preparedSupabaseData.api_id) {
    log.error('[ensureStrainInSupabase] api_id is required to ensure strain in Supabase.');
    return null;
  }

  if (!preparedSupabaseData.name) {
    log.error('[ensureStrainInSupabase] name is required to ensure strain in Supabase.');
    return null;
  }

  log.info(
    `[ensureStrainInSupabase] Ensuring strain with api_id: ${preparedSupabaseData.api_id}, name: ${preparedSupabaseData.name}`
  );

  try {
    // First, check if strain already exists by api_id
    const { data: existingStrain, error: checkError } = await supabase
      .from('strains')
      .select('id')
      .eq('api_id', preparedSupabaseData.api_id)
      .maybeSingle();

    if (checkError) {
      log.error(`[ensureStrainInSupabase] Error checking existing strain:`, checkError);
      return null;
    }
    if (existingStrain) {
      log.info(
        `[ensureStrainInSupabase] Strain with api_id ${preparedSupabaseData.api_id} already exists (ID: ${existingStrain.id})`
      );
      return existingStrain.id;
    }

    log.info(`[ensureStrainInSupabase] Attempting to upsert strain:`, {
      api_id: preparedSupabaseData.api_id,
      name: preparedSupabaseData.name,
      type: preparedSupabaseData.type,
    });

    // Use upsert with onConflict strategy to safely send the full payload
    // This lets the database ignore unknown columns and prevent overwriting existing data with nulls
    const { data: insertedStrain, error: insertError } = await supabase
      .from('strains')
      .upsert([preparedSupabaseData], {
        onConflict: 'api_id',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (insertError) {
      log.error(
        `[ensureStrainInSupabase] Insert error for api_id ${preparedSupabaseData.api_id}:`,
        {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        }
      );

      // Handle specific error cases
      if (insertError.code === '23505') {
        // Duplicate key error - try to find the existing strain
        log.info(
          `[ensureStrainInSupabase] Duplicate key error, attempting to find existing strain`
        );
        const { data: duplicateStrain, error: findError } = await supabase
          .from('strains')
          .select('id')
          .eq('api_id', preparedSupabaseData.api_id)
          .maybeSingle();

        if (!findError && duplicateStrain) {
          log.info(
            `[ensureStrainInSupabase] Found existing strain after duplicate error (ID: ${duplicateStrain.id})`
          );
          return duplicateStrain.id;
        }
      } else if (insertError.code === 'PGRST204') {
        // Schema error - column doesn't exist
        log.error(`[ensureStrainInSupabase] Schema error - column doesn't exist in database:`, {
          error: insertError.message,
          hint: 'The data being sent contains fields that do not exist in the Supabase table schema',
        });
        throw new Error(
          `Database schema error: ${insertError.message}. Please check that all fields exist in the Supabase strains table.`
        );
      }

      return null;
    }

    if (!insertedStrain || !insertedStrain.id) {
      log.error(
        `[ensureStrainInSupabase] Insert operation for api_id ${preparedSupabaseData.api_id} did not return an ID.`
      );
      return null;
    }

    log.info(
      `[ensureStrainInSupabase] Strain with api_id ${preparedSupabaseData.api_id} created successfully (Supabase ID: ${insertedStrain.id}).`
    );
    return insertedStrain.id;
  } catch (error) {
    log.error(
      `[ensureStrainInSupabase] Unexpected error during strain ensure for api_id ${preparedSupabaseData.api_id}:`,
      error
    );
    return null;
  }
}

/**
 * Ensures a strain exists in WatermelonDB. If it exists (by api_id), it updates it. Otherwise, it creates it.
 * Returns the WatermelonDB internal ID of the strain.
 */
export async function ensureStrainInLocalDB(
  preparedWdbData: Partial<WDBStrainModel> & { api_id: string }
): Promise<string | null> {
  if (!preparedWdbData.api_id) {
    log.error('[ensureStrainInLocalDB] api_id is required to ensure strain in WatermelonDB.');
    return null;
  }
  log.info(`[ensureStrainInLocalDB] Ensuring strain with api_id: ${preparedWdbData.api_id}`);
  const strainsCollection = database.collections.get<WDBStrainModel>('strains');

  try {
    let strainRecord: WDBStrainModel | null = null;
    const existingStrains = await strainsCollection
      .query(Q.where('api_id', preparedWdbData.api_id))
      .fetch();

    if (existingStrains.length > 0 && existingStrains[0]) {
      strainRecord = existingStrains[0];
      log.info(
        `[ensureStrainInLocalDB] Strain with api_id ${preparedWdbData.api_id} found (WDB ID: ${strainRecord.id}). Updating.`
      );
      await database.write(async () => {
        await strainRecord!.update((record) => {
          Object.keys(preparedWdbData).forEach((key) => {
            // @ts-ignore
            record[key] = preparedWdbData[key as keyof typeof preparedWdbData];
          });
        });
      });
      log.info(`[ensureStrainInLocalDB] Strain (WDB ID: ${strainRecord.id}) updated successfully.`);
    } else {
      log.info(
        `[ensureStrainInLocalDB] Strain with api_id ${preparedWdbData.api_id} not found. Creating new entry.`
      );
      await database.write(async () => {
        strainRecord = await strainsCollection.create((record) => {
          Object.keys(preparedWdbData).forEach((key) => {
            // @ts-ignore
            record[key] = preparedWdbData[key as keyof typeof preparedWdbData];
          });
        });
      });
      if (!strainRecord) {
        log.error('[ensureStrainInLocalDB] Created new strain but record is null.');
        return null;
      }
      // Explicitly type strainRecord after the guard to resolve potential inference issues.
      const confirmedStrainRecord: WDBStrainModel = strainRecord;
      log.info(
        `[ensureStrainInLocalDB] New strain created successfully (WDB ID: ${confirmedStrainRecord.id}).`
      );
    }
    // Ensure the final return also uses the potentially updated strainRecord
    if (strainRecord) {
      return strainRecord.id;
    }
    return null;
  } catch (error) {
    log.error(
      `[ensureStrainInLocalDB] Failed to ensure strain (api_id: ${preparedWdbData.api_id}):`,
      error
    );
    return null;
  }
}

// -----------------------------------------------------------------------------
// Legacy compatibility helpers migrated from deprecated strain-service.ts and
// strain-sync-service.ts (hyphen variant). These keep external API surface
// intact while consolidating all strain-related logic into this single module.
// -----------------------------------------------------------------------------

/**
 * Adapts a Supabase row into the frontend Strain model used throughout the UI.
 */
export function adaptStrainFromDB(dbStrain: any): Strain {
  return {
    id: dbStrain.id,
    api_id: dbStrain.api_id,
    name: dbStrain.name,
    // MIGRATION TODO (Target: July 18, 2025): Remove species field mapping after UI migration complete
    // Map Supabase "type" column to legacy `species` field for backward compatibility
    // This mapping supports components still using the deprecated StrainSpecies enum
    species: dbStrain.type ?? dbStrain.species,
    // Preserve explicit `type` field for consumers that migrated to the new name
    type: dbStrain.type,
    thc: dbStrain.thc_content,
    cbd: dbStrain.cbd_content,
    description: dbStrain.description,
    effects: dbStrain.effects || [],
    flavors: dbStrain.flavors || [],
    difficulty: dbStrain.grow_difficulty,
    flowering_time: dbStrain.flowering_time,
    image_url: dbStrain.image_url,
    origin: dbStrain.origin,
    yield_indoor: dbStrain.yield_indoor,
    yield_outdoor: dbStrain.yield_outdoor,
    medical_uses: dbStrain.medical_uses || [],
    negative_effects: dbStrain.negative_effects || [],
    growing_tips: dbStrain.growing_tips,
    breeder: dbStrain.breeder,
    is_auto_flower: dbStrain.is_auto_flower,
    is_feminized: dbStrain.is_feminized,
    height_indoor: dbStrain.height_indoor,
    height_outdoor: dbStrain.height_outdoor,
    created_at: dbStrain.created_at,
    updated_at: dbStrain.updated_at,
  } as Strain;
}

/**
 * Paginated strain fetch with rich filtering – API compatible with the original
 * getStrains() from strain-service.ts so existing hooks keep working.
 */
export async function getStrains({
  search = '',
  page = 1,
  limit = 20,
  species = '',
  effect = '',
  flavor = '',
  minThc,
  maxThc,
}: {
  search?: string;
  page?: number;
  limit?: number;
  species?: string;
  effect?: string;
  flavor?: string;
  minThc?: number;
  maxThc?: number;
} = {}): Promise<{ strains: Strain[]; total: number; hasMore: boolean }> {
  try {
    let query = supabase
      .from('strains')
      .select('*', { count: 'exact' })
      .order('name')
      .range((page - 1) * limit, page * limit - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    // MIGRATION TODO (Target: July 18, 2025): Update parameter name from 'species' to 'type'
    // The column was renamed from "species" -> "type" in DB. Use the new column while keeping
    // the function parameter name unchanged for API compatibility.
    if (species) query = query.eq('type', species);
    if (effect) query = query.ilike('effects', `%${effect}%`);
    if (flavor) query = query.ilike('flavors', `%${flavor}%`);
    if (minThc != null) query = query.gte('thc_content', minThc);
    if (maxThc != null) query = query.lte('thc_content', maxThc);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      strains: (data || []).map(adaptStrainFromDB),
      total: count || 0,
      hasMore: count ? page * limit < count : false,
    };
  } catch (error) {
    log.error('[getStrains] Error fetching strains:', error);
    return { strains: [], total: 0, hasMore: false };
  }
}

// -----------------------------------------------------------------------------
// Consolidated findOrCreateLocalStrain (previously in strain-sync-service.ts)
// -----------------------------------------------------------------------------

// Basic RawApiStrainData interface for compatibility with existing callers.
export interface RawApiStrainData {
  api_id: string;
  _id?: string;
  name?: string;
  type?: string;
  description?: string | string[];
  thc?: string | number;
  THC?: string | number;
  cbd?: string | number;
  CBD?: string | number;
  genetics?: string;
  floweringTime?: string;
  fromSeedToHarvest?: string;
  floweringType?: string;
  growDifficulty?: string;
  yieldIndoor?: string;
  yieldOutdoor?: string;
  heightIndoor?: string;
  heightOutdoor?: string;
  effects?: string[];
  flavors?: string[];
  parents?: string[];
  harvestTimeOutdoor?: string;
  link?: string;
}

// Helper utilities (duplicated names are avoided to prevent collisions)
function _legacyParsePercentage(value?: string | number): number | null {
  if (value === null || value === undefined || String(value).toLowerCase() === 'unknown') {
    return null;
  }
  if (typeof value === 'number') return value;
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  return match && match[1] ? parseFloat(match[1]) : null;
}

function _legacyExtractFloweringWeeks(value?: string): number | null {
  if (!value) return null;
  const week = String(value).match(/(\d+)(?:-(\d+))?\s*weeks?/i);
  if (week && week[1]) return parseInt(week[1], 10);
  const day = String(value).match(/(\d+)\s*days?/i);
  if (day && day[1]) return Math.round(parseInt(day[1], 10) / 7);
  return null;
}

function _legacyFormatDescription(desc?: string | string[]): string | null {
  if (!desc) return null;
  return Array.isArray(desc) ? desc.join('\n') : desc;
}

function prepareStrainDataForSupabase(raw: RawApiStrainData): Partial<SupabaseStrain> | null {
  const effectiveApiId = raw.api_id || raw._id;
  if (!effectiveApiId) return null;
  const supa: Partial<SupabaseStrain> = {
    api_id: effectiveApiId,
    name: raw.name ?? undefined,
    type: raw.type || null,
    description: _legacyFormatDescription(raw.description),
    thc_percentage: _legacyParsePercentage(raw.thc || raw.THC),
    cbd_percentage: _legacyParsePercentage(raw.cbd || raw.CBD),
    genetics: raw.genetics || null,
    flowering_time: _legacyExtractFloweringWeeks(raw.floweringTime || raw.fromSeedToHarvest),
    flowering_type: raw.floweringType || null,
    grow_difficulty: raw.growDifficulty || null,
    average_yield:
      raw.yieldIndoor && raw.yieldOutdoor
        ? `Indoor: ${raw.yieldIndoor}, Outdoor: ${raw.yieldOutdoor}`
        : raw.yieldIndoor || raw.yieldOutdoor || null,
    height_indoor: raw.heightIndoor || null,
    height_outdoor: raw.heightOutdoor || null,
    effects: raw.effects || null,
    flavors: raw.flavors || null,
    harvest_time_outdoor: raw.harvestTimeOutdoor || null,
    link: raw.link || null,
  };
  Object.keys(supa).forEach((k) => {
    // @ts-ignore cleanup undefined
    if (supa[k] === undefined) supa[k] = null;
  });
  return supa;
}

/**
 * Ensures the strain exists in Supabase (creates if needed) and returns the
 * resulting Supabase row. Also ensures a WatermelonDB mirror for offline use.
 */
export async function findOrCreateLocalStrain(
  apiId: string,
  rawData?: RawApiStrainData
): Promise<SupabaseStrain | null> {
  if (!apiId) return null;

  // Attempt to locate by api_id first
  const { data: existing, error } = await supabase
    .from('strains')
    .select('*')
    .eq('api_id', apiId)
    .maybeSingle();
  if (error) log.warn('[findOrCreateLocalStrain] lookup error:', error);
  if (existing) return existing as SupabaseStrain;

  if (!rawData) return null; // nothing more we can do

  const prepared = prepareStrainDataForSupabase(rawData);
  if (!prepared) return null;

  // Upsert into Supabase
  const { data: inserted, error: upErr } = await supabase
    .from('strains')
    .upsert([prepared as SupabaseStrain], { onConflict: 'api_id', ignoreDuplicates: false })
    .select('*')
    .single();
  if (upErr) {
    log.error('[findOrCreateLocalStrain] upsert failed:', upErr);
    return null;
  }

  // Mirror into WatermelonDB for offline availability
  const wdbData = prepareDataForWatermelonDB({ ...rawData, api_id: apiId } as RawStrainApiResponse);
  if (wdbData) await ensureStrainInLocalDB(wdbData as any);

  return inserted as SupabaseStrain;
}
