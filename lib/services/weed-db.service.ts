import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { 
  Strain, 
  CachedResponse, 
  StrainFilterParams, 
  RawStrainApiResponse, 
  ApiResponseArray, 
  ApiResponseSingle 
} from '../types/weed-db';
import { z } from 'zod';

// --- Configuration ---
const BASE_URL = 'https://the-weed-db.p.rapidapi.com/api';
// Use the key from expo-constants extra config
const API_KEY = Constants.expoConfig?.extra?.rapidApiKey as string | undefined;
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
  | ['filtered-strains', string, string | null, string | null, string | null, number | null, number | null, string]
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
  console.error(
    'ERROR: RAPIDAPI_KEY is missing in app.config.js extra section! Please ensure it is configured correctly in app.config.js and potentially loaded from your .env file.',
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
axiosInstance.interceptors.request.use(request => {
  console.log('WeedDB Request:', request.method, request.url, request.params);
  return request;
});
axiosInstance.interceptors.response.use(
  response => {
    console.log('WeedDB Response Data:', response.data);
    return response;
  },
  error => {
    console.error('WeedDB Response Error:', error);
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
    console.error('Cache read error:', error);
    return null;
  }
}

async function saveToCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// --- Retry Logic ---
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry<T>(
  requestFn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    const axiosError = error as AxiosError;
    if (
      axiosError.response?.status === 429 && // Too Many Requests
      retries > 0
    ) {
      console.warn(
        `Rate limit hit. Retrying in ${delayMs / 1000}s... (${retries} retries left)`,
      );
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
function mapWeedDbStrain(raw: any): Strain {
  return {
    id: String(raw._id || raw.id),
    name: raw.name,
    genetics: raw.genetics,
    type: raw.type,
    thc: raw.THC ?? raw.thc,
    cbd: raw.CBD ?? raw.cbd,
    growDifficulty: raw.growDifficulty || raw.grow_difficulty,
    floweringTime: raw.floweringTime || raw.flowering_time,
    floweringType: raw.floweringType || raw.flowering_type,
    parents: raw.parents
      ? Array.isArray(raw.parents)
        ? raw.parents
        : [raw.parents]
      : undefined,
    image: raw.imageUrl || raw.image_url || raw.image,
    imageUrl: raw.imageUrl || raw.image_url || raw.image,
    description: Array.isArray(raw.description)
      ? raw.description.join(' ')
      : raw.description,
    effects: raw.effect || raw.effects,
    flavors: raw.smellAndFlavour || raw.smell_and_flavour || raw.flavors,
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
  };
}

// --- API Service ---
// Helper to handle caching and fetching for filter/list endpoints
async function fetchStrains(
  params: StrainFilterParams,
): Promise<CachedResponse<Strain[]>> {
  // Create a properly formatted parameters object
  const formattedParams: Record<string, any> = {};
  
  // Handle search parameter differently - it needs special treatment
  if (params.search) {
    // The API expects name parameter for search, not search
    formattedParams.name = params.search;
    console.log(`[DEBUG] Search query formatted as name=${params.search}`);
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
    console.log(`[DEBUG] Returning cached data for ${JSON.stringify(formattedParams)}`);
    return { data: cachedData, isFromCache: true };
  }

  try {
    console.log(`[DEBUG] Fetching strains with params:`, formattedParams);
    const response = await requestWithRetry<AxiosResponse<RawStrainApiResponse[] | ApiResponseArray>>(() =>
      axiosInstance.get<RawStrainApiResponse[] | ApiResponseArray>('/strains', { params: formattedParams }),
    );

    const rawStrains = Array.isArray(response.data)
      ? (response.data as RawStrainApiResponse[])
      : Array.isArray(response.data.data)
        ? (response.data.data as RawStrainApiResponse[])
        : [];
        
    console.log(`[DEBUG] API returned ${rawStrains.length} raw strains`);

    // Validate with Zod
    const parsed = StrainArraySchema.safeParse(rawStrains);
    if (!parsed.success) {
      console.error('Strain API response validation failed:', parsed.error);
      return { data: [], isFromCache: false, error: 'Invalid API response' };
    }

    const mappedStrains: Strain[] = parsed.data.map(mapWeedDbStrain);
    console.log(`[DEBUG] Mapped ${mappedStrains.length} strains successfully`);

    await saveToCache(cacheKey, mappedStrains);
    return { data: mappedStrains, isFromCache: false };
  } catch (error) {
    console.error('Error fetching strains:', error);
    return { data: [], isFromCache: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper to handle caching and fetching for single strain endpoint
async function fetchStrainById(id: string): Promise<Strain | null> {
  try {
    const response = await requestWithRetry<AxiosResponse<RawStrainApiResponse[] | ApiResponseArray>>(() =>
      axiosInstance.get<RawStrainApiResponse[] | ApiResponseArray>('/strains', { params: { id } }),
    );

    const rawStrains = Array.isArray(response.data)
      ? (response.data as RawStrainApiResponse[])
      : Array.isArray(response.data.data)
        ? (response.data.data as RawStrainApiResponse[])
        : [];

    if (!rawStrains.length) {
      console.error(`Strain with ID ${id} not found.`);
      return null;
    }

    const parsed = StrainSchema.safeParse(rawStrains[0]);
    if (!parsed.success) {
      console.error('Strain API response validation failed for ID:', id, parsed.error);
      return null;
    }

    return mapWeedDbStrain(parsed.data);
  } catch (error) {
    console.error(`Error fetching strain by ID ${id}:`, error);
    return null;
  }
}

/**
 * Ensures a strain exists in the database. If it already exists (duplicate key), fetches and returns the existing strain's ID.
 * @param strain Partial<Strain> with at least a name property
 * @returns The strain's ID if found or created
 * @throws Error if the strain cannot be created or found
 */
export async function ensureStrainExists(strain: Pick<Strain, 'name' | 'type'> & Partial<Strain>): Promise<string> {
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
  } catch (error: any) {
    // If duplicate key error, fetch by name
    if (error.response && error.response.data &&
      (error.response.data.code === '23505' ||
        (typeof error.response.data.message === 'string' && error.response.data.message.includes('duplicate key')))
    ) {
      // Try to fetch the existing strain by name
      const found = await fetchStrains({ search: strain.name });
      const match = found.data.find(s => s.name.toLowerCase() === strain.name.toLowerCase());
      if (match && match.id) return String(match.id);
      throw new Error('Strain exists but could not be found by name');
    }
    throw error;
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
  async list(
    page = 1,
    limit = 50,
  ): Promise<CachedResponse<Strain[]>> {
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
    console.log(`[DEBUG] WeedDbService.searchByName called with query: "${name}"`);
    
    // Empty search shouldn't hit the API, return empty results
    if (!name || name.trim() === '') {
      return { data: [], isFromCache: false };
    }

    try {
      // Execute API search with the name parameter
      const searchTerm = name.trim().toLowerCase();
      console.log(`[DEBUG] Executing API search with term: "${searchTerm}"`);
      const result = await fetchStrains({ search: searchTerm });
      
      console.log(`[DEBUG] API search returned ${result.data.length} results`);
      
      // If API returned results, use them
      if (result.data.length > 0) {
        return result;
      }
      
      // No results from API, use simple client-side name search
      console.log('[DEBUG] Using fallback client-side name search');
      
      // Fetch a dataset to search within
      const allStrains = await fetchStrains({ limit: 100 });
      
      // Simple client-side search that only checks strain names
      const filteredStrains = allStrains.data.filter(strain => 
        (strain.name || '').toLowerCase().includes(searchTerm)
      );
      
      console.log(`[DEBUG] Client-side name search found ${filteredStrains.length} results`);
      
      return { 
        data: filteredStrains, 
        isFromCache: allStrains.isFromCache,
        error: filteredStrains.length === 0 ? 'No strain names found matching your search' : undefined 
      };
    } catch (error) {
      console.error(`[ERROR] Search failed for query "${name}":`, error);
      return { data: [], isFromCache: false, error: 'Search failed' };
    }
  },

  /**
   * Filters strains by grow difficulty.
   * @param level The difficulty level.
   * @returns A list of matching strains with caching information.
   */
  async filterByGrowDifficulty(
    level: 'easy' | 'medium' | 'difficult',
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
  async filterByThc(
    min: number,
    max: number,
  ): Promise<CachedResponse<Strain[]>> {
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
  async filterByType(
    type: 'sativa' | 'indica' | 'hybrid',
  ): Promise<CachedResponse<Strain[]>> {
    return fetchStrains({ type });
  },
};
