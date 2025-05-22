/**
 * StrainSyncService
 *
 * A service for synchronizing strains between the external API and the local WatermelonDB database.
 */

// WatermelonDB Imports
import { Q } from '@nozbe/watermelondb';
import database from '../database/database';
import { Strain as WDBStrainModel } from '../models/Strain'; // Corrected: Aliased import
import { RawStrainApiResponse } from '../types/weed-db';
import { SupabaseStrain } from '../types/supabase'; // Added import
import { log } from '../utils/logger';
import supabase from '../supabase'; // Import the supabase client
import {
  sanitizeString,
  parseOptionalNumber,
  parseOptionalStringArray,
  parsePercentageString,
} from '../utils/data-parsing'; // Corrected path

const STRAIN_API_URL = 'https://www.weed.db/api/strains';

/**
 * Prepares raw API data for insertion into the WatermelonDB 'strains' table.
 */
export function prepareDataForWatermelonDB(apiStrain: RawStrainApiResponse): Partial<WDBStrainModel> & { api_id: string } { // Corrected: Use WDBStrainModel
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

  const thcPercentage = parsePercentageString(apiStrain.thc || apiStrain.THC); // is: number | null
  const cbdPercentage = parsePercentageString(apiStrain.cbd || apiStrain.CBD); // is: number | null

  // Parse floweringTime as a single number. Assumes API provides it as a string like "10 weeks" or a direct number.
  // The parseOptionalNumber function will attempt to extract a number from the string.
  const floweringTime = parseOptionalNumber(apiStrain.floweringTime || apiStrain.fromSeedToHarvest); // is: number | null

  const wdbData: Partial<WDBStrainModel> & { api_id: string } = { // Corrected: Use WDBStrainModel
    api_id: sanitizeString(apiStrain.api_id), // Assuming api_id is required and sanitizeString returns string for valid input
    name: sanitizeString(apiStrain.name),     // Assuming name is required and sanitizeString returns string for valid input
    type: (apiStrain.type ? sanitizeString(apiStrain.type) : null) ?? undefined,
    description: descriptionString ?? undefined,
    thcPercentage: thcPercentage ?? undefined,
    cbdPercentage: cbdPercentage ?? undefined,
    floweringTime: floweringTime ?? undefined,
    growDifficulty: (apiStrain.growDifficulty ? sanitizeString(apiStrain.growDifficulty) : null) ?? undefined,
    effects: effectsArray ? JSON.stringify(effectsArray) : undefined,
    flavors: flavorsArray ? JSON.stringify(flavorsArray) : undefined,
    terpenes: terpenesArray ? JSON.stringify(terpenesArray) : undefined,
    parents: parentsArray ? JSON.stringify(parentsArray) : undefined,
    origin: originArray ? JSON.stringify(originArray) : undefined, // Storing as JSON string or undefined
    genetics: (apiStrain.genetics ? sanitizeString(apiStrain.genetics) : null) ?? undefined,
    floweringType: (apiStrain.floweringType ? sanitizeString(apiStrain.floweringType) : null) ?? undefined,
    heightIndoor: (apiStrain.heightIndoor != null ? sanitizeString(String(apiStrain.heightIndoor)) : null) ?? undefined,
    heightOutdoor: (apiStrain.heightOutdoor != null ? sanitizeString(String(apiStrain.heightOutdoor)) : null) ?? undefined,
    averageYield: (apiStrain.average_yield != null ? sanitizeString(String(apiStrain.average_yield)) : null) ?? undefined,
    yieldIndoor: (apiStrain.yieldIndoor ? sanitizeString(apiStrain.yieldIndoor) : null) ?? undefined,
    yieldOutdoor: (apiStrain.yieldOutdoor ? sanitizeString(apiStrain.yieldOutdoor) : null) ?? undefined,
    harvestTimeOutdoor: (apiStrain.harvestTimeOutdoor ? sanitizeString(apiStrain.harvestTimeOutdoor) : null) ?? undefined,
    link: (apiStrain.link ? sanitizeString(apiStrain.link) : null) ?? undefined,
  };

  // Clean up undefined properties to null, which WatermelonDB handles better.
  Object.keys(wdbData).forEach(key => {
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
              log.info(`Updating existing strain in WatermelonDB: ${strainToUpdate.name} (API ID: ${rawStrain.api_id})`);
              await strainToUpdate.update((record: WDBStrainModel) => { // Corrected: Add type to record
                Object.keys(preparedData).forEach(key => {
                  // @ts-ignore 
                  record[key] = preparedData[key as keyof typeof preparedData];
                });
              });
            } else {
              log.warn(`Strain with API ID: ${rawStrain.api_id} found in query but was undefined unexpectedly.`);
            }
          } else {
            log.info(`Creating new strain in WatermelonDB: ${preparedData.name} (API ID: ${rawStrain.api_id})`);
            await strainsCollection.create((record: WDBStrainModel) => { // Corrected: Add type to record
              Object.keys(preparedData).forEach(key => {
                // @ts-ignore 
                record[key] = preparedData[key as keyof typeof preparedData];
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
export async function getAllStrainsFromWatermelonDB(): Promise<WDBStrainModel[]> { // Corrected: Use WDBStrainModel
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
export async function searchStrainsInWatermelonDB(query: string): Promise<WDBStrainModel[]> { // Corrected: Use WDBStrainModel
  if (!query || query.trim() === '') {
    return getAllStrainsFromWatermelonDB();
  }
  try {
    const lowerCaseQuery = query.toLowerCase();
    log.info(`Searching for strains in WatermelonDB with query: "${lowerCaseQuery}"`);
    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel
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
export async function getStrainByIdFromWatermelonDB(id: string): Promise<WDBStrainModel | null> { // Corrected: Use WDBStrainModel
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
export async function getStrainsByTypeFromWatermelonDB(type: string): Promise<WDBStrainModel[]> { // Corrected: Use WDBStrainModel
  if (!type || type.trim() === '') {
    log.warn('Attempted to fetch strains by empty type.');
    return [];
  }
  try {
    const lowerCaseType = type.toLowerCase();
    log.info(`Fetching strains by type: "${lowerCaseType}" from WatermelonDB.`);
    const strainsCollection = database.collections.get<WDBStrainModel>('strains'); // Corrected: Use WDBStrainModel
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

// Helper function to ensure a value is a number or null
function ensureNumberOrNull(value: any): number | null {
  // Check if the value is a number and not NaN
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  // Check if the value is a string that can be converted to a number
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }
  }
  return null;
}


export function convertWdbStrainToRawApi(wdbStrain: WDBStrainModel): RawStrainApiResponse {
  const rawApiResponse: RawStrainApiResponse = {
    api_id: (wdbStrain as any).api_id ?? (wdbStrain as any).apiId ?? '', 
    name: wdbStrain.name, 
    type: ensureStringOrNull(wdbStrain.type),
    description: ensureStringOrNull(wdbStrain.description),
    thc: wdbStrain.thcPercentage !== null && wdbStrain.thcPercentage !== undefined ? wdbStrain.thcPercentage.toString() : null,
    cbd: wdbStrain.cbdPercentage !== null && wdbStrain.cbdPercentage !== undefined ? wdbStrain.cbdPercentage.toString() : null,
    floweringTime: wdbStrain.floweringTime !== null && wdbStrain.floweringTime !== undefined ? wdbStrain.floweringTime.toString() : null,
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

  Object.keys(rawApiResponse).forEach(keyStr => {
    const key = keyStr as keyof RawStrainApiResponse;
    if (rawApiResponse[key] === undefined) {
      // @ts-ignore
      rawApiResponse[key] = null;
    }
  });

  return rawApiResponse;
}

export function convertSupabaseStrainToRawApi(supabaseStrain: SupabaseStrain): RawStrainApiResponse {
  const rawApiResponse: RawStrainApiResponse = {
    api_id: supabaseStrain.api_id || '',
    name: supabaseStrain.name,
    type: ensureStringOrNull(supabaseStrain.type),
    description: ensureStringOrNull(supabaseStrain.description),
    thc: supabaseStrain.thc_percentage !== null && supabaseStrain.thc_percentage !== undefined ? supabaseStrain.thc_percentage.toString() : null,
    cbd: supabaseStrain.cbd_percentage !== null && supabaseStrain.cbd_percentage !== undefined ? supabaseStrain.cbd_percentage.toString() : null,
    floweringTime: supabaseStrain.flowering_time !== null && supabaseStrain.flowering_time !== undefined ? supabaseStrain.flowering_time.toString() : null,
    growDifficulty: ensureStringOrNull(supabaseStrain.grow_difficulty),
    effects: Array.isArray(supabaseStrain.effects) ? supabaseStrain.effects.map(String) : [],
    flavors: Array.isArray(supabaseStrain.flavors) ? supabaseStrain.flavors.map(String) : [],
    terpenes: Array.isArray(supabaseStrain.terpenes) ? supabaseStrain.terpenes.map(String) : [],
    parents: Array.isArray(supabaseStrain.parents) ? supabaseStrain.parents.map(String) : [],
    origin: Array.isArray(supabaseStrain.origin) ? supabaseStrain.origin.map(String) : [],
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

  Object.keys(rawApiResponse).forEach(keyStr => {
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
export async function searchStrainsInSupabase(query: string, limit: number = 10): Promise<SupabaseStrain[]> {
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

/**
 * Fetches strains from the external API by query.
 * Note: This assumes the external API supports a query parameter for searching.
 * The actual API endpoint and query parameter might need adjustment.
 */
export async function fetchStrainsFromApiByQuery(query: string, limit: number = 10): Promise<RawStrainApiResponse[]> {
  if (!query || query.trim() === '') {
    log.info('External API search query is empty, returning no results.');
    return [];
  }
  try {
    log.info(`Fetching strains from external API by query: "${query}", limit: ${limit}`);
    // Adjust the API URL and query parameter as needed.
    // This is a placeholder URL structure.
    const apiUrl = new URL(STRAIN_API_URL); // Assuming STRAIN_API_URL is the base
    apiUrl.searchParams.append('search', query); // Example: /api/strains?search=query
    apiUrl.searchParams.append('limit', String(limit));

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Failed to fetch strains from external API by query', { status: response.status, error: errorText, query });
      throw new Error(`External API request failed with status ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    log.info(`Successfully fetched ${Array.isArray(data) ? data.length : 0} strains from external API for query "${query}"`);
    return Array.isArray(data) ? data as RawStrainApiResponse[] : [];
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
export async function searchStrainsMultiLayered(query: string, limit: number = 10): Promise<RawStrainApiResponse[]> {
  log.info(`Starting multi-layered strain search for query: "${query}", limit: ${limit}`);
  let combinedResults: RawStrainApiResponse[] = [];
  const foundApiIds = new Set<string>();

  // 1. Search in WatermelonDB
  try {
    const wdbResults = await searchStrainsInWatermelonDB(query);
    log.info(`Found ${wdbResults.length} results in WatermelonDB for "${query}".`);
    wdbResults.forEach(wdbStrain => {
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
    supabaseResults.forEach(sbStrain => {
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
    apiResults.forEach(apiStrain => {
      if (apiStrain.api_id && !foundApiIds.has(apiStrain.api_id)) { // Corrected: Added missing closing parenthesis
        combinedResults.push(apiStrain);
        foundApiIds.add(apiStrain.api_id);
      }
    });
  } catch (error) {
    log.error('Error searching External API in multi-layered search:', error);
  }
  
  log.info(`Multi-layered search completed. Total unique results: ${combinedResults.length} for query "${query}".`);
  return combinedResults.slice(0, limit);
}

// Additional WatermelonDB specific utility functions can be added here as needed.
// For example, functions to count strains, get strains with specific criteria, etc.

/**
 * Prepares raw API data for insertion or update into the Supabase 'strains' table.
 */
export function prepareDataForSupabase(apiStrain: RawStrainApiResponse): Partial<SupabaseStrain> & { api_id: string } {
  const effectsArray = parseOptionalStringArray(apiStrain.effects);
  const flavorsArray = parseOptionalStringArray(apiStrain.flavors);
  const terpenesArray = parseOptionalStringArray(apiStrain.terpenes);
  const parentsArray = parseOptionalStringArray(apiStrain.parents);
  const originArray = parseOptionalStringArray(apiStrain.origin);
  let descriptionString: string | null = null;
  if (Array.isArray(apiStrain.description)) {
    descriptionString = sanitizeString(apiStrain.description.join('\n'));
  } else if (apiStrain.description) {
    descriptionString = sanitizeString(apiStrain.description);
  }

  const thcPercentage = parsePercentageString(apiStrain.thc || apiStrain.THC);
  const cbdPercentage = parsePercentageString(apiStrain.cbd || apiStrain.CBD);
  const floweringTime = parseOptionalNumber(apiStrain.floweringTime || apiStrain.fromSeedToHarvest);

  const supabaseData: Partial<SupabaseStrain> & { api_id: string } = {
    api_id: sanitizeString(apiStrain.api_id),
    name: sanitizeString(apiStrain.name),
    type: apiStrain.type ? sanitizeString(apiStrain.type) : null,
    description: descriptionString,
    thc_percentage: thcPercentage,
    cbd_percentage: cbdPercentage,
    flowering_time: floweringTime,
    grow_difficulty: apiStrain.growDifficulty ? sanitizeString(apiStrain.growDifficulty) : null,
    effects: effectsArray,
    flavors: flavorsArray,
    terpenes: terpenesArray,
    parents: parentsArray,
    origin: originArray,
    genetics: apiStrain.genetics ? sanitizeString(apiStrain.genetics) : null,
    flowering_type: apiStrain.floweringType ? sanitizeString(apiStrain.floweringType) : null,
    height_indoor: apiStrain.heightIndoor != null ? sanitizeString(String(apiStrain.heightIndoor)) : null,
    height_outdoor: apiStrain.heightOutdoor != null ? sanitizeString(String(apiStrain.heightOutdoor)) : null,
    average_yield: apiStrain.average_yield != null ? sanitizeString(String(apiStrain.average_yield)) : null,
    yield_indoor: apiStrain.yieldIndoor ? sanitizeString(apiStrain.yieldIndoor) : null,
    yield_outdoor: apiStrain.yieldOutdoor ? sanitizeString(apiStrain.yieldOutdoor) : null,
    harvest_time_outdoor: apiStrain.harvestTimeOutdoor ? sanitizeString(apiStrain.harvestTimeOutdoor) : null,
    link: apiStrain.link ? sanitizeString(apiStrain.link) : null,
  };

  // Clean up undefined properties to null for Supabase
  Object.keys(supabaseData).forEach(key => {
    const k = key as keyof typeof supabaseData;
    // @ts-ignore
    if (supabaseData[k] === undefined) {
      // @ts-ignore
      supabaseData[k] = null;
    }
  });

  return supabaseData;
}

/**
 * Ensures a strain exists in Supabase. If it exists (by api_id), it updates it. Otherwise, it creates it.
 * Returns the Supabase internal ID (uuid) of the strain.
 */
export async function ensureStrainInSupabase(preparedSupabaseData: Partial<SupabaseStrain> & { api_id: string }): Promise<string | null> {
  if (!preparedSupabaseData.api_id) {
    log.error('[ensureStrainInSupabase] api_id is required to ensure strain in Supabase.');
    return null;
  }
  log.info(`[ensureStrainInSupabase] Ensuring strain with api_id: ${preparedSupabaseData.api_id} using upsert.`);

  try {
    // Use upsert to either insert or update the strain based on api_id conflict
    const { data, error } = await supabase
      .from('strains')
      .upsert(preparedSupabaseData as Omit<SupabaseStrain, 'id' | 'created_at' | 'updated_at'>, { onConflict: 'api_id' })
      .select('id') // Select the id of the upserted row
      .single(); // Expect a single row to be returned

    if (error) {
      log.error(`[ensureStrainInSupabase] Upsert error for api_id ${preparedSupabaseData.api_id}:`, error);
      // Check for specific error types if needed, e.g., unique constraint violation if onConflict wasn't correctly configured
      // or if another unique constraint (not on api_id) was violated.
      if (error.message.includes('unique constraint') && !error.message.includes('strains_api_id_key')) {
        log.warn(`[ensureStrainInSupabase] A different unique constraint might have been violated for api_id: ${preparedSupabaseData.api_id}. This could indicate a data integrity issue or a need to review other unique fields.`);
      }
      return null; // Return null if upsert fails
    }

    if (!data || !data.id) {
      log.error(`[ensureStrainInSupabase] Upsert operation for api_id ${preparedSupabaseData.api_id} did not return an ID.`);
      return null;
    }

    log.info(`[ensureStrainInSupabase] Strain with api_id ${preparedSupabaseData.api_id} ensured successfully (Supabase ID: ${data.id}).`);
    return data.id;

  } catch (error) { // Catch any unexpected errors during the operation
    log.error(`[ensureStrainInSupabase] Unexpected error during upsert for api_id ${preparedSupabaseData.api_id}:`, error);
    return null;
  }
}

/**
 * Ensures a strain exists in WatermelonDB. If it exists (by api_id), it updates it. Otherwise, it creates it.
 * Returns the WatermelonDB internal ID of the strain.
 */
export async function ensureStrainInLocalDB(preparedWdbData: Partial<WDBStrainModel> & { api_id: string }): Promise<string | null> {
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
      log.info(`[ensureStrainInLocalDB] Strain with api_id ${preparedWdbData.api_id} found (WDB ID: ${strainRecord.id}). Updating.`);
      await database.write(async () => {
        await strainRecord!.update(record => {
          Object.keys(preparedWdbData).forEach(key => {
            // @ts-ignore
            record[key] = preparedWdbData[key as keyof typeof preparedWdbData];
          });
        });
      });
      log.info(`[ensureStrainInLocalDB] Strain (WDB ID: ${strainRecord.id}) updated successfully.`);
    } else {
      log.info(`[ensureStrainInLocalDB] Strain with api_id ${preparedWdbData.api_id} not found. Creating new entry.`);
      await database.write(async () => {
        strainRecord = await strainsCollection.create(record => {
          Object.keys(preparedWdbData).forEach(key => {
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
      log.info(`[ensureStrainInLocalDB] New strain created successfully (WDB ID: ${confirmedStrainRecord.id}).`);
    }
    // Ensure the final return also uses the potentially updated strainRecord
    if (strainRecord) {
      return strainRecord.id;
    }
    return null;
  } catch (error) {
    log.error(`[ensureStrainInLocalDB] Failed to ensure strain (api_id: ${preparedWdbData.api_id}):`, error);
    return null;
  }
}
