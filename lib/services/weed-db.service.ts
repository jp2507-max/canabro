import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import { z } from 'zod';

import {
  Strain,
  CachedResponse,
  PaginatedResponse,
  PaginatedCachedResponse,
  StrainFilterParams,
  RawStrainApiResponse,
  ApiResponseArray,
} from '../types/weed-db';
import { logger } from '../config/production';
import { generateStableFallbackKey, isValidId } from '../utils/string-utils';

// --- Configuration ---
const BASE_URL = 'https://the-weed-db.p.rapidapi.com/api';
// Use the key from expo-constants extra config
const API_KEY = Constants.expoConfig?.extra?.RAPIDAPI_KEY as string | undefined;
const API_HOST = 'the-weed-db.p.rapidapi.com';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Define a type to ensure our query keys are properly typed
export type WeedDbQueryKeys =
  | ['weedDb']
  | ['weedDb', 'list']
  | ['weedDb', 'list', Partial<StrainFilterParams>]
  | ['weedDb', 'detail']
  | ['weedDb', 'detail', string]
  | ['weedDb', 'search', string]
  | ['weedDb', 'effect', string]
  | ['weedDb', 'flavor', string]
  | ['weedDb', 'thc', number, number]
  | ['weedDb', 'type', 'sativa' | 'indica' | 'hybrid']
  | ['weedDb', 'parent', string]
  | [
      'filtered-strains',
      string,
      string | null,
      string | null,
      string | null,
      number | null,
      number | null,
      string,
    ]
  | ['strain-detail-placeholder']
  | ['strains-effect-placeholder']
  | ['strains-flavor-placeholder']
  | ['strains-thc-placeholder'];

// --- Query Keys ---
export const weedDbKeys = {
  all: ['weedDb'] as const,
  lists: () => [...weedDbKeys.all, 'list'] as const,
  list: (params: Partial<StrainFilterParams>) => [...weedDbKeys.lists(), params] as const,
  details: () => [...weedDbKeys.all, 'detail'] as const,
  detail: (id: string) => [...weedDbKeys.details(), id] as const,
  search: (query: string) => [...weedDbKeys.all, 'search', query] as const,
  effects: (effect: string) => [...weedDbKeys.all, 'effect', effect] as const,
  flavors: (flavor: string) => [...weedDbKeys.all, 'flavor', flavor] as const,
  thc: (min: number, max: number) => [...weedDbKeys.all, 'thc', min, max] as const,
  type: (type: 'sativa' | 'indica' | 'hybrid') => [...weedDbKeys.all, 'type', type] as const,
  parent: (parentName: string) => [...weedDbKeys.all, 'parent', parentName] as const,
};

// Add a check in case the key is missing
if (!API_KEY) {
  logger.error(
    'ERROR: RAPIDAPI_KEY is missing in app.config.js extra section! Please ensure it is configured correctly in app.config.js and potentially loaded from your .env file.'
  );
  // Optionally throw an error to prevent the app from running without a key
  // throw new Error("Missing RapidAPI Key configuration.");
}

// --- Axios Instance ---
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-RapidAPI-Key': API_KEY || '', // Use the key from Constants or empty string if missing
    'X-RapidAPI-Host': API_HOST,
    'Content-Type': 'application/json',
  },
});

// --- Debug Logging ---
// Log WeedDB requests and responses to help debug connection issues
axiosInstance.interceptors.request.use((request) => {
  logger.log('WeedDB Request:', request.method, request.url, request.params);
  return request;
});
axiosInstance.interceptors.response.use(
  (response) => {
    logger.log('WeedDB Response Data:', response.data);
    return response;
  },
  (error) => {
    logger.error('WeedDB Response Error:', error);
    return Promise.reject(error);
  }
);

// --- Caching Utilities ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      await AsyncStorage.removeItem(key); // Cache expired
      return null;
    }
    return entry.data;
  } catch (error) {
    logger.error('Cache read error:', error);
    return null;
  }
}

async function saveToCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    logger.error('Cache write error:', error);
  }
}

// --- Retry Logic ---
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry<T>(
  requestFn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    const axiosError = error as AxiosError;
    if (
      axiosError.response?.status === 429 && // Too Many Requests
      retries > 0
    ) {
      logger.warn(`Rate limit hit. Retrying in ${delayMs / 1000}s... (${retries} retries left)`);
      await delay(delayMs);
      // Exponential backoff: double the delay for the next retry
      return requestWithRetry(requestFn, retries - 1, delayMs * 2);
    }
    // Re-throw other errors or if retries are exhausted
    throw error;
  }
}

// --- Zod Schema for Strain Validation ---
const StrainSchema = z.object({
  _id: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  genetics: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  THC: z.any().optional().nullable(),
  thc: z.any().optional().nullable(),
  CBD: z.any().optional().nullable(),
  cbd: z.any().optional().nullable(),
  growDifficulty: z.string().optional().nullable(),
  grow_difficulty: z.string().optional().nullable(),
  floweringTime: z.any().optional().nullable(),
  flowering_time: z.any().optional().nullable(),
  floweringType: z.string().optional().nullable(),
  flowering_type: z.string().optional().nullable(),
  parents: z.any().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.any().optional().nullable(),
  effect: z.any().optional().nullable(),
  effects: z.any().optional().nullable(),
  smellAndFlavour: z.any().optional().nullable(),
  smell_and_flavour: z.any().optional().nullable(),
  flavors: z.any().optional().nullable(),
  origin: z.string().optional().nullable(),
  breeder: z.string().optional().nullable(),
  isAutoFlower: z.boolean().optional().nullable(),
  is_auto_flower: z.boolean().optional().nullable(),
  isFeminized: z.boolean().optional().nullable(),
  is_feminized: z.boolean().optional().nullable(),
  heightIndoor: z.any().optional().nullable(),
  height_indoor: z.any().optional().nullable(),
  heightOutdoor: z.any().optional().nullable(),
  height_outdoor: z.any().optional().nullable(),
  yieldIndoor: z.any().optional().nullable(),
  yield_indoor: z.any().optional().nullable(),
  yieldOutdoor: z.any().optional().nullable(),
  yield_outdoor: z.any().optional().nullable(),
  medicalUses: z.any().optional().nullable(),
  medical_uses: z.any().optional().nullable(),
  negativeEffects: z.any().optional().nullable(),
  negative_effects: z.any().optional().nullable(),
  growingTips: z.any().optional().nullable(),
  growing_tips: z.any().optional().nullable(),
  harvestTimeOutdoor: z.any().optional().nullable(),
  harvest_time_outdoor: z.any().optional().nullable(),
  link: z.string().optional().nullable(),
  createdAt: z.any().optional().nullable(),
  created_at: z.any().optional().nullable(),
  updatedAt: z.any().optional().nullable(),
  updated_at: z.any().optional().nullable(),
});

const StrainArraySchema = z.array(StrainSchema);

// --- Helper: Map WeedDB API snake_case to camelCase for Strain ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWeedDbStrain(raw: any): Strain {
  // Helper for determining strain type from genetics info
  const determineStrainType = (genetic?: string): string | undefined => {
    if (!genetic) return undefined;
    const lowerGenetic = genetic.toLowerCase();

    if (lowerGenetic.includes('sativa') && lowerGenetic.includes('indica')) {
      // If it mentions percentages, more precise determination
      if (lowerGenetic.includes('%')) {
        const sativaMatch = lowerGenetic.match(/sativa.*?(\d+)%/i);
        const indicaMatch = lowerGenetic.match(/indica.*?(\d+)%/i);

        const sativaPercent = sativaMatch?.[1] ? parseInt(sativaMatch[1], 10) : 0;
        const indicaPercent = indicaMatch?.[1] ? parseInt(indicaMatch[1], 10) : 0;

        if (sativaPercent > indicaPercent) return 'sativa';
        if (indicaPercent > sativaPercent) return 'indica';
        return 'hybrid';
      }
      return 'hybrid';
    }

    if (lowerGenetic.includes('sativa')) return 'sativa';
    if (lowerGenetic.includes('indica')) return 'indica';

    return 'hybrid'; // Default fallback
  };

  // Extract type from multiple sources
  const strainType = raw.type || determineStrainType(raw.genetics) || 'hybrid';

  // Format description from array or string
  const formattedDescription = Array.isArray(raw.description)
    ? raw.description.join('\n\n')
    : raw.description;

  // Ensure we have a valid ID, generate a stable fallback if needed
  const primaryId = raw._id || raw.id;
  const validId = isValidId(primaryId) ? String(primaryId) : null;
  const finalId = validId || generateStableFallbackKey(raw.name, strainType, raw.genetics, 'strain');

  // Log warning if we had to generate a fallback ID
  if (!validId && __DEV__) {
    logger.warn('Generated fallback ID for strain without valid primary ID', {
      originalId: primaryId,
      fallbackId: finalId,
      strainName: raw.name,
    });
  }

  return {
    id: finalId,
    name: raw.name,
    genetics: raw.genetics,
    type: strainType,
    thc: raw.THC ?? raw.thc,
    cbd: raw.CBD ?? raw.cbd,
    growDifficulty: raw.growDifficulty || raw.grow_difficulty,
    floweringTime: raw.floweringTime || raw.flowering_time,
    floweringType: raw.floweringType || raw.flowering_type,
    parents: raw.parents ? (Array.isArray(raw.parents) ? raw.parents : [raw.parents]) : undefined,
    image: raw.imageUrl || raw.image_url || raw.image,
    imageUrl: raw.imageUrl || raw.image_url || raw.image,
    description: formattedDescription,
    effects: raw.effect || raw.effects,
    flavors: raw.smellAndFlavour || raw.smell_and_flavour || raw.flavors || raw.smellAndFlavour,
    origin: raw.origin,
    breeder: raw.breeder,
    isAutoFlower: raw.isAutoFlower ?? raw.is_auto_flower,
    isFeminized: raw.isFeminized ?? raw.is_feminized,
    heightIndoor: raw.heightIndoor || raw.height_indoor,
    heightOutdoor: raw.heightOutdoor || raw.height_outdoor,
    yieldIndoor: raw.yieldIndoor || raw.yield_indoor,
    yieldOutdoor: raw.yieldOutdoor || raw.yield_outdoor,
    medicalUses: raw.medicalUses || raw.medical_uses,
    negativeEffects: raw.negativeEffects || raw.negative_effects,
    growingTips: raw.growingTips || raw.growing_tips,
    harvestTimeOutdoor: raw.harvestTimeOutdoor || raw.harvest_time_outdoor,
    link: raw.link,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
    // Ensure the API ID is always available
    api_id: String(raw._id || raw.id),
    originalId: String(raw._id || raw.id),
  };
}

// --- API Service ---
// Helper to handle caching and fetching for filter/list endpoints
async function fetchStrains(params: StrainFilterParams): Promise<CachedResponse<Strain[]>> {
  // Create a properly formatted parameters object
  const formattedParams: Record<string, unknown> = {};

  // Handle search parameter differently - it needs special treatment
  if (params.search) {
    // The API expects name parameter for search, not search
    formattedParams.name = params.search;
    logger.log(`[DEBUG] Search query formatted as name=${params.search}`);
  }

  // Add all other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'search' && value !== undefined && value !== null) {
      formattedParams[key] = value;
    }
  });

  const cacheKey = `strains-${JSON.stringify(formattedParams)}`;
  const cachedData = await getFromCache<Strain[]>(cacheKey);

  if (cachedData) {
    logger.log(`[DEBUG] Returning cached data for ${JSON.stringify(formattedParams)}`);
    return { data: cachedData, isFromCache: true };
  }

  try {
    logger.log(`[DEBUG] Fetching strains with params:`, formattedParams);
    const response = await requestWithRetry<
      AxiosResponse<RawStrainApiResponse[] | ApiResponseArray>
    >(() =>
      axiosInstance.get<RawStrainApiResponse[] | ApiResponseArray>('/strains', {
        params: formattedParams,
      })
    );

    const rawStrains = Array.isArray(response.data)
      ? (response.data as RawStrainApiResponse[])
      : Array.isArray(response.data.data)
        ? (response.data.data as RawStrainApiResponse[])
        : [];

    logger.log(`[DEBUG] API returned ${rawStrains.length} raw strains`);

    // Validate with Zod
    const parsed = StrainArraySchema.safeParse(rawStrains);
    if (!parsed.success) {
      logger.error('Strain API response validation failed:', parsed.error);
      return { data: [], isFromCache: false, error: 'Invalid API response' };
    }

    const mappedStrains: Strain[] = parsed.data.map(mapWeedDbStrain);
    logger.log(`[DEBUG] Mapped ${mappedStrains.length} strains successfully`);

    await saveToCache(cacheKey, mappedStrains);
    return { data: mappedStrains, isFromCache: false };
  } catch (error) {
    logger.error('Error fetching strains:', error);
    return {
      data: [],
      isFromCache: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// New function for paginated fetching
async function fetchStrainsPaginated(params: StrainFilterParams): Promise<PaginatedCachedResponse<Strain>> {
  // Create a properly formatted parameters object
  const formattedParams: Record<string, unknown> = {};

  // Handle search parameter differently - it needs special treatment
  if (params.search) {
    // The API expects name parameter for search, not search
    formattedParams.name = params.search;
    logger.log(`[DEBUG] Search query formatted as name=${params.search}`);
  }

  // Handle pagination parameters
  const page = params.page || 1;
  const pageSize = params.page_size || params.limit || 50;
  formattedParams.page = page;
  formattedParams.page_size = pageSize;

  // Add all other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'search' && key !== 'page' && key !== 'limit' && key !== 'page_size' && value !== undefined && value !== null) {
      formattedParams[key] = value;
    }
  });

  const cacheKey = `strains-paginated-${JSON.stringify(formattedParams)}`;
  const cachedData = await getFromCache<PaginatedResponse<Strain>>(cacheKey);

  if (cachedData) {
    logger.log(`[DEBUG] Returning cached paginated data for ${JSON.stringify(formattedParams)}`);
    return { data: cachedData, isFromCache: true };
  }

  try {
    logger.log(`[DEBUG] Fetching paginated strains with params:`, formattedParams);
    const response = await requestWithRetry<
      AxiosResponse<{ items: RawStrainApiResponse[]; total_count: number; page: number; page_size: number; total_pages: number; } | RawStrainApiResponse[] | ApiResponseArray>
    >(() =>
      axiosInstance.get<{ items: RawStrainApiResponse[]; total_count: number; page: number; page_size: number; total_pages: number; } | RawStrainApiResponse[] | ApiResponseArray>('/strains', {
        params: formattedParams,
      })
    );

    // Handle different response formats
    let paginatedData: PaginatedResponse<Strain>;
    
    if (response.data && typeof response.data === 'object' && 'items' in response.data && 'total_count' in response.data) {
      // API returns paginated format
      const rawStrains = response.data.items as RawStrainApiResponse[];
      const parsed = StrainArraySchema.safeParse(rawStrains);
      
      if (!parsed.success) {
        logger.error('Strain API response validation failed:', parsed.error);
        return { 
          data: { items: [], total_count: 0, page: 1, page_size: pageSize, total_pages: 0 }, 
          isFromCache: false, 
          error: 'Invalid API response' 
        };
      }

      const mappedStrains: Strain[] = parsed.data.map(mapWeedDbStrain);
      
      paginatedData = {
        items: mappedStrains,
        total_count: response.data.total_count,
        page: response.data.page,
        page_size: response.data.page_size,
        total_pages: response.data.total_pages,
      };
    } else {
      // API returns array format - simulate pagination
      const rawStrains = Array.isArray(response.data)
        ? (response.data as RawStrainApiResponse[])
        : 'data' in response.data && Array.isArray(response.data.data)
          ? (response.data.data as RawStrainApiResponse[])
          : [];

      const parsed = StrainArraySchema.safeParse(rawStrains);
      if (!parsed.success) {
        logger.error('Strain API response validation failed:', parsed.error);
        return { 
          data: { items: [], total_count: 0, page: 1, page_size: pageSize, total_pages: 0 }, 
          isFromCache: false, 
          error: 'Invalid API response' 
        };
      }

      const mappedStrains: Strain[] = parsed.data.map(mapWeedDbStrain);
      
      // Simulate pagination on client side as fallback
      const totalCount = mappedStrains.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = mappedStrains.slice(startIndex, endIndex);
      const totalPages = Math.ceil(totalCount / pageSize);

      paginatedData = {
        items: paginatedItems,
        total_count: totalCount,
        page: page,
        page_size: pageSize,
        total_pages: totalPages,
      };
    }

    logger.log(`[DEBUG] Mapped ${paginatedData.items.length} strains successfully (page ${paginatedData.page}/${paginatedData.total_pages})`);

    await saveToCache(cacheKey, paginatedData);
    return { data: paginatedData, isFromCache: false };
  } catch (error) {
    logger.error('Error fetching paginated strains:', error);
    return {
      data: { items: [], total_count: 0, page: 1, page_size: pageSize, total_pages: 0 },
      isFromCache: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper to handle caching and fetching for single strain endpoint
async function fetchStrainById(id: string): Promise<Strain | null> {
  try {
    const response = await requestWithRetry<
      AxiosResponse<RawStrainApiResponse[] | ApiResponseArray>
    >(() =>
      axiosInstance.get<RawStrainApiResponse[] | ApiResponseArray>('/strains', { params: { id } })
    );

    const rawStrains = Array.isArray(response.data)
      ? (response.data as RawStrainApiResponse[])
      : Array.isArray(response.data.data)
        ? (response.data.data as RawStrainApiResponse[])
        : [];

    if (!rawStrains.length) {
      logger.error(`Strain with ID ${id} not found.`);
      return null;
    }

    const parsed = StrainSchema.safeParse(rawStrains[0]);
    if (!parsed.success) {
      logger.error('Strain API response validation failed for ID:', id, parsed.error);
      return null;
    }

    return mapWeedDbStrain(parsed.data);
  } catch (error: unknown) {
    logger.error(`Error fetching strain by ID ${id}:`, error);
    return null;
  }
}

/**
 * Type guard to check if an error has a response property with nested data
 */
function hasErrorResponse(error: unknown): error is { response: { data: unknown } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as Record<string, unknown>).response === 'object' &&
    (error as Record<string, unknown>).response !== null &&
    'data' in ((error as Record<string, unknown>).response as Record<string, unknown>)
  );
}

/**
 * Type guard to check if error data has a code property
 */
function hasErrorCode(data: unknown): data is { code: string } {
  return typeof data === 'object' && data !== null && 'code' in data && typeof (data as Record<string, unknown>).code === 'string';
}

/**
 * Type guard to check if error data has a message property
 */
function hasErrorMessage(data: unknown): data is { message: string } {
  return typeof data === 'object' && data !== null && 'message' in data && typeof (data as Record<string, unknown>).message === 'string';
}

/**
 * Safely checks if an error indicates a duplicate key constraint violation
 */
function isDuplicateKeyError(error: unknown): boolean {
  if (!hasErrorResponse(error)) return false;
  
  const { data } = error.response;
  
  // Check for PostgreSQL duplicate key error code
  if (hasErrorCode(data) && data.code === '23505') {
    return true;
  }
  
  // Check for duplicate key message
  if (hasErrorMessage(data) && data.message.includes('duplicate key')) {
    return true;
  }
  
  return false;
}

/**
 * Ensures a strain exists in the database. If it already exists (duplicate key), fetches and returns the existing strain's ID.
 * @param strain Partial<Strain> with at least a name property
 * @returns The strain's ID if found or created
 * @throws Error if the strain cannot be created or found
 */
export async function ensureStrainExists(
  strain: Pick<Strain, 'name' | 'type'> & Partial<Strain>
): Promise<string> {
  if (!strain.name) throw new Error('Strain name is required');
  try {
    // Try to create the strain (replace with your actual insert logic)
    // This is a placeholder: replace with your DB insert call
    const response = await axiosInstance.post('/strains', strain);
    if (response.data && (response.data.id || response.data._id)) {
      return String(response.data.id || response.data._id);
    }
    // If API returns the created object
    if (response.data && response.data.name === strain.name && response.data.id) {
      return String(response.data.id);
    }
    throw new Error('Failed to create strain');
  } catch (error: unknown) {
    // If duplicate key error, fetch by name
    if (isDuplicateKeyError(error)) {
      // Try to fetch the existing strain by name
      const found = await fetchStrains({ search: strain.name });
      const match = found.data.find((s) => s.name.toLowerCase() === strain.name.toLowerCase());
      if (match && match.id) return String(match.id);
      throw new Error('Strain exists but could not be found by name');
    }
    throw error as Error;
  }
}

export const WeedDbService = {
  /**
   * Expose the Axios instance for potential reuse or custom requests.
   */
  axiosInstance,

  /**
   * Fetches a paginated list of strains.
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 50)
   * @returns A list of strains with caching information.
   */
  async list(page = 1, limit = 50): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ page, limit });
  },

  /**
   * Fetches a specific strain by its ID.
   * @param id The ID of the strain.
   * @returns The strain details or null if not found.
   */
  async getById(id: string): Promise<Strain | null> {
    return fetchStrainById(id);
  },

  /**
   * Searches for strains by name.
   * @param name The search query.
   * @returns A list of matching strains with caching information.
   */
  async searchByName(name: string): Promise<CachedResponse<Strain[]>> {
    logger.log(`[DEBUG] WeedDbService.searchByName called with query: "${name}"`);

    // Empty search shouldn't hit the API, return empty results
    if (!name || name.trim() === '') {
      return { data: [], isFromCache: false };
    }

    try {
      // Execute API search with the name parameter (Weed-DB returns fuzzy matches).
      const searchTerm = name.trim().toLowerCase();
      logger.log(`[DEBUG] Executing API search with term: "${searchTerm}" (prefix match)`);
      const result = await fetchStrains({ search: searchTerm });

      // Filter to prefix-matches only
      const prefixFiltered = result.data.filter((s: Strain) =>
        (s.name || '').toLowerCase().startsWith(searchTerm)
      );

      logger.log(
        `[DEBUG] API search returned ${result.data.length} results – ${prefixFiltered.length} after prefix filter`
      );

      if (prefixFiltered.length > 0) {
        return { ...result, data: prefixFiltered };
      }

      // No results from API, use simple client-side name search
      logger.log('[DEBUG] Using fallback client-side name search');

      // Fetch a dataset to search within
      const allStrains = await fetchStrains({ limit: 100 });

      // Simple client-side search that only checks strain names (prefix)
      const filteredStrains = allStrains.data.filter((strain: Strain) =>
        (strain.name || '').toLowerCase().startsWith(searchTerm)
      );

      logger.log(`[DEBUG] Client-side name search found ${filteredStrains.length} results`);

      return {
        data: filteredStrains,
        isFromCache: allStrains.isFromCache,
        error:
          filteredStrains.length === 0 ? 'No strain names found matching your search' : undefined,
      };
    } catch (error) {
      logger.error(`[ERROR] Search failed for query "${name}":`, error);
      return { data: [], isFromCache: false, error: 'Search failed' };
    }
  },

  /**
   * Searches for strains by name.
   * @param query The search query string.
   * @returns A list of matching strains with caching information.
   */
  async search(query: string): Promise<CachedResponse<Strain[]>> {
    logger.log(`[DEBUG] WeedDbService.search called with query: "${query}"`);
    return this.searchByName(query);
  },

  /**
   * Filters strains by grow difficulty.
   * @param level The difficulty level.
   * @returns A list of matching strains with caching information.
   */
  async filterByGrowDifficulty(
    level: 'easy' | 'medium' | 'difficult'
  ): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ growDifficulty: level });
  },

  /**
   * Filters strains by effect.
   * @param effect The effect to filter by.
   * @returns A list of matching strains with caching information.
   */
  async filterByEffect(effect: string): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ effect });
  },

  /**
   * Filters strains by flavor.
   * @param flavor The flavor to filter by.
   * @returns A list of matching strains with caching information.
   */
  async filterByFlavor(flavor: string): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ flavor });
  },

  /**
   * Filters strains by THC content range.
   * @param min Minimum THC percentage.
   * @param max Maximum THC percentage.
   * @returns A list of matching strains with caching information.
   */
  async filterByThc(min: number, max: number): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ thcMin: min, thcMax: max });
  },

  /**
   * Filters strains by parent strain name.
   * @param parentName The name of the parent strain.
   * @returns A list of matching strains with caching information.
   */
  async filterByParent(parentName: string): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ parent: parentName });
  },

  /**
   * Filters strains by type (sativa, indica, hybrid).
   * @param type The strain type.
   * @returns A list of matching strains with caching information.
   */
  async filterByType(type: 'sativa' | 'indica' | 'hybrid'): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ type });
  },

  /**
   * Filters strains by type (sativa, indica, hybrid) with pagination.
   * @param type The strain type.
   * @param page Page number (default: 1).
   * @param pageSize Number of items per page (default: 50).
   * @returns A paginated list of matching strains with caching information.
   */
  async filterByTypePaginated(
    type: 'sativa' | 'indica' | 'hybrid',
    page = 1,
    pageSize = 50
  ): Promise<PaginatedCachedResponse<Strain>> {
    return fetchStrainsPaginated({ type, page, page_size: pageSize });
  },

  /**
   * Searches for strains by name with pagination.
   * @param query The search query string.
   * @param page Page number (default: 1).
   * @param pageSize Number of items per page (default: 50).
   * @returns A paginated list of matching strains with caching information.
   */
  async searchPaginated(
    query: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedCachedResponse<Strain>> {
    return fetchStrainsPaginated({ search: query, page, page_size: pageSize });
  },

  /**
   * Fetches a paginated list of strains with pagination.
   * @param page Page number (default: 1).
   * @param pageSize Number of items per page (default: 50).
   * @returns A paginated list of strains with caching information.
   */
  async listPaginated(page = 1, pageSize = 50): Promise<PaginatedCachedResponse<Strain>> {
    return fetchStrainsPaginated({ page, page_size: pageSize });
  },
};
