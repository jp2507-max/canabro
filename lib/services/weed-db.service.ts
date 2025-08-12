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

// ETag cache (in-memory + persisted for session)
const etagStoreKey = 'weeddb-etags';
let etagStore: Record<string, string> | null = null;

async function loadEtagStore(): Promise<Record<string, string>> {
  if (etagStore) return etagStore;
  try {
    const raw = await AsyncStorage.getItem(etagStoreKey);
    etagStore = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    etagStore = {};
  }
  return etagStore!;
}

async function saveEtagStore(): Promise<void> {
  if (!etagStore) return;
  try {
    await AsyncStorage.setItem(etagStoreKey, JSON.stringify(etagStore));
  } catch {
    // ignore
  }
}

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

/**
 * Helper: Map WeedDB API snake_case to camelCase for Strain
 * Accepts unknown and narrows using the validated Zod shape.
 */
function isStrainType(value: unknown): value is 'sativa' | 'indica' | 'hybrid' {
  return value === 'sativa' || value === 'indica' || value === 'hybrid';
}

function mapWeedDbStrain(raw: unknown): Strain {
  // Narrow using Zod safeParse to ensure expected fields exist
  const parsed = StrainSchema.safeParse(raw);
  const safe = parsed.success ? parsed.data : (raw as Record<string, unknown>);
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
  const strainType =
    (safe as { type?: string }).type ||
    determineStrainType((safe as { genetics?: string | null | undefined }).genetics ?? undefined) ||
    'hybrid';

  // Format description from array or string
  const formattedDescription = Array.isArray((safe as { description?: unknown }).description)
    ? ((safe as { description?: unknown }).description as unknown[]).join('\n\n')
    : ((safe as { description?: string | null | undefined }).description ?? undefined);

  // Ensure we have a valid ID, generate a stable fallback if needed
  const primaryId = (safe as { _id?: unknown; id?: unknown })._id ?? (safe as { _id?: unknown; id?: unknown }).id;
  const validId = isValidId(primaryId) ? String(primaryId) : null;
  const finalId =
    validId ||
    generateStableFallbackKey(
      String((safe as { name?: unknown }).name ?? ''),
      strainType,
      (safe as { genetics?: string | null | undefined }).genetics ?? undefined,
      'strain'
    );

  // Log warning if we had to generate a fallback ID
  if (!validId && __DEV__) {
    logger.warn('Generated fallback ID for strain without valid primary ID', {
      originalId: primaryId,
      fallbackId: finalId,
      strainName: String((safe as { name?: unknown }).name ?? ''),
    });
  }

  return {
    id: finalId,
    name: String((safe as { name?: unknown }).name ?? ''),
    genetics: (safe as { genetics?: string | null | undefined }).genetics ?? undefined,
    type: isStrainType(strainType) ? strainType : 'hybrid',
    thc: (() => {
      const v = (safe as { THC?: unknown; thc?: unknown }).THC ?? (safe as { THC?: unknown; thc?: unknown }).thc;
      return typeof v === 'number' ? v : v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
    })(),
    cbd: (() => {
      const v = (safe as { CBD?: unknown; cbd?: unknown }).CBD ?? (safe as { CBD?: unknown; cbd?: unknown }).cbd;
      return typeof v === 'number' ? v : v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
    })(),
    growDifficulty: (() => {
      const v =
        (safe as { growDifficulty?: unknown; grow_difficulty?: unknown }).growDifficulty ??
        (safe as { growDifficulty?: unknown; grow_difficulty?: unknown }).grow_difficulty;
      return v === 'easy' || v === 'medium' || v === 'difficult' ? v : undefined;
    })(),
    floweringTime: (() => {
      const v =
        (safe as { floweringTime?: unknown; flowering_time?: unknown }).floweringTime ??
        (safe as { floweringTime?: unknown; flowering_time?: unknown }).flowering_time;
      return typeof v === 'string' ? v : v == null ? undefined : String(v);
    })(),
    floweringType: (() => {
      const v =
        (safe as { floweringType?: unknown; flowering_type?: unknown }).floweringType ??
        (safe as { floweringType?: unknown; flowering_type?: unknown }).flowering_type;
      return typeof v === 'string' ? v : v == null ? undefined : String(v);
    })(),
    parents: ((): string[] | undefined => {
      const p = (safe as { parents?: unknown }).parents;
      if (p == null) return undefined;
      if (Array.isArray(p)) return p.map(String);
      return [String(p)];
    })(),
    image: (() => {
      const v =
        (safe as { imageUrl?: unknown; image_url?: unknown; image?: unknown }).imageUrl ??
        (safe as { imageUrl?: unknown; image_url?: unknown; image?: unknown }).image_url ??
        (safe as { imageUrl?: unknown; image_url?: unknown; image?: unknown }).image;
      return typeof v === 'string' ? v : undefined;
    })(),
    imageUrl: (() => {
      const v =
        (safe as { imageUrl?: unknown; image_url?: unknown; image?: unknown }).imageUrl ??
        (safe as { imageUrl?: unknown; image_url?: unknown; image?: unknown }).image_url ??
        (safe as { imageUrl?: unknown; image_url?: unknown; image?: unknown }).image;
      return typeof v === 'string' ? v : undefined;
    })(),
    description: formattedDescription ?? undefined,
    effects: (() => {
      const v =
        (safe as { effect?: unknown; effects?: unknown }).effect ??
        (safe as { effect?: unknown; effects?: unknown }).effects;
      if (Array.isArray(v)) return v.map(String);
      return typeof v === 'string' ? [v] : undefined;
    })(),
    flavors: (() => {
      const v1 =
        (safe as { smellAndFlavour?: unknown; smell_and_flavour?: unknown; flavors?: unknown })
          .smellAndFlavour;
      const v2 =
        (safe as { smellAndFlavour?: unknown; smell_and_flavour?: unknown; flavors?: unknown })
          .smell_and_flavour;
      const v3 =
        (safe as { smellAndFlavour?: unknown; smell_and_flavour?: unknown; flavors?: unknown }).flavors;
      const v = v1 ?? v2 ?? v3 ?? v1;
      if (Array.isArray(v)) return v.map(String);
      return typeof v === 'string' ? [v] : undefined;
    })(),
    origin: (() => {
      const v = (safe as { origin?: unknown }).origin;
      return typeof v === 'string' ? v : undefined;
    })(),
    breeder: (() => {
      const v = (safe as { breeder?: unknown }).breeder;
      return typeof v === 'string' ? v : undefined;
    })(),
    isAutoFlower:
      (safe as { isAutoFlower?: boolean | null; is_auto_flower?: boolean | null }).isAutoFlower ??
      (safe as { isAutoFlower?: boolean | null; is_auto_flower?: boolean | null }).is_auto_flower ??
      undefined,
    isFeminized:
      (safe as { isFeminized?: boolean | null; is_feminized?: boolean | null }).isFeminized ??
      (safe as { isFeminized?: boolean | null; is_feminized?: boolean | null }).is_feminized ??
      undefined,
    heightIndoor: (() => {
      const v =
        (safe as { heightIndoor?: unknown; height_indoor?: unknown }).heightIndoor ??
        (safe as { heightIndoor?: unknown; height_indoor?: unknown }).height_indoor;
      return typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(' / ') : undefined;
    })(),
    heightOutdoor: (() => {
      const v =
        (safe as { heightOutdoor?: unknown; height_outdoor?: unknown }).heightOutdoor ??
        (safe as { heightOutdoor?: unknown; height_outdoor?: unknown }).height_outdoor;
      return typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(' / ') : undefined;
    })(),
    yieldIndoor: (() => {
      const v =
        (safe as { yieldIndoor?: unknown; yield_indoor?: unknown }).yieldIndoor ??
        (safe as { yieldIndoor?: unknown; yield_indoor?: unknown }).yield_indoor;
      return typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(' / ') : undefined;
    })(),
    yieldOutdoor: (() => {
      const v =
        (safe as { yieldOutdoor?: unknown; yield_outdoor?: unknown }).yieldOutdoor ??
        (safe as { yieldOutdoor?: unknown; yield_outdoor?: unknown }).yield_outdoor;
      return typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(' / ') : undefined;
    })(),
    medicalUses: (() => {
      const v =
        (safe as { medicalUses?: unknown; medical_uses?: unknown }).medicalUses ??
        (safe as { medicalUses?: unknown; medical_uses?: unknown }).medical_uses;
      if (Array.isArray(v)) return v.map(String);
      return typeof v === 'string' ? [v] : undefined;
    })(),
    negativeEffects: (() => {
      const v =
        (safe as { negativeEffects?: unknown; negative_effects?: unknown }).negativeEffects ??
        (safe as { negativeEffects?: unknown; negative_effects?: unknown }).negative_effects;
      if (Array.isArray(v)) return v.map(String);
      return typeof v === 'string' ? [v] : undefined;
    })(),
    growingTips: (() => {
      const v =
        (safe as { growingTips?: unknown; growing_tips?: unknown }).growingTips ??
        (safe as { growingTips?: unknown; growing_tips?: unknown }).growing_tips;
      if (Array.isArray(v)) return v.map(String).join('\n\n');
      return typeof v === 'string' ? v : undefined;
    })(),
    harvestTimeOutdoor: (() => {
      const v =
        (safe as { harvestTimeOutdoor?: unknown; harvest_time_outdoor?: unknown }).harvestTimeOutdoor ??
        (safe as { harvestTimeOutdoor?: unknown; harvest_time_outdoor?: unknown }).harvest_time_outdoor;
      return typeof v === 'string' ? v : v == null ? undefined : String(v);
    })(),
    link: (() => {
      const v = (safe as { link?: unknown }).link;
      return typeof v === 'string' ? v : undefined;
    })(),
    createdAt: (() => {
      const v =
        (safe as { createdAt?: unknown; created_at?: unknown }).createdAt ??
        (safe as { createdAt?: unknown; created_at?: unknown }).created_at;
      return typeof v === 'string' || typeof v === 'number' ? v : v == null ? undefined : String(v);
    })(),
    updatedAt: (() => {
      const v =
        (safe as { updatedAt?: unknown; updated_at?: unknown }).updatedAt ??
        (safe as { updatedAt?: unknown; updated_at?: unknown }).updated_at;
      return typeof v === 'string' || typeof v === 'number' ? v : v == null ? undefined : String(v);
    })(),
    // Ensure the API ID is always available
    api_id: String(
      (safe as { _id?: unknown; id?: unknown })._id ?? (safe as { _id?: unknown; id?: unknown }).id ?? ''
    ),
    originalId: String(
      (safe as { _id?: unknown; id?: unknown })._id ?? (safe as { _id?: unknown; id?: unknown }).id ?? ''
    ),
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
    // Prepare ETag conditional headers
    const etags = await loadEtagStore();
    const etagKey = `/strains:${JSON.stringify(formattedParams)}`;
    const ifNoneMatch = etags[etagKey];

    logger.log(`[DEBUG] Fetching strains with params:`, formattedParams);
    const response = await requestWithRetry<
      AxiosResponse<RawStrainApiResponse[] | ApiResponseArray>
    >(() =>
      axiosInstance.get<RawStrainApiResponse[] | ApiResponseArray>('/strains', {
        params: formattedParams,
        headers: ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : undefined,
        validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
      })
    );

    // Handle 304 Not Modified
    if (response.status === 304) {
      if (cachedData) {
        logger.log('[DEBUG] 304 Not Modified - serving cached list');
        return { data: cachedData, isFromCache: true };
      }

      // Fallback: No cached data available but received 304. Perform a full fetch without conditional headers.
      logger.warn('[WARN] 304 received with no cached data. Performing fallback full fetch.');
      try {
        const freshResponse = await requestWithRetry<
          AxiosResponse<RawStrainApiResponse[] | ApiResponseArray>
        >(() =>
          axiosInstance.get<RawStrainApiResponse[] | ApiResponseArray>('/strains', {
            params: formattedParams,
            // Remove conditional headers to force a fresh response
            validateStatus: (s) => s >= 200 && s < 300,
          })
        );

        const freshRawStrains = Array.isArray(freshResponse.data)
          ? (freshResponse.data as RawStrainApiResponse[])
          : Array.isArray((freshResponse.data as ApiResponseArray)?.data)
            ? ((freshResponse.data as ApiResponseArray).data as RawStrainApiResponse[])
            : [];

        const freshParsed = StrainArraySchema.safeParse(freshRawStrains);
        if (!freshParsed.success) {
          logger.error('Strain API fallback response validation failed:', freshParsed.error);
          return { data: [], isFromCache: false, error: 'Invalid API response' };
        }

        const freshMapped: Strain[] = freshParsed.data.map(mapWeedDbStrain);
        await saveToCache(cacheKey, freshMapped);

        // Persist (possibly new) ETag for this query
        const freshEtag = freshResponse.headers?.etag || freshResponse.headers?.ETag;
        if (freshEtag) {
          etags[etagKey] = freshEtag as string;
          await saveEtagStore();
        }

        logger.log(`[DEBUG] Fallback full fetch succeeded with ${freshMapped.length} strains`);
        return { data: freshMapped, isFromCache: false };
      } catch (fallbackError) {
        logger.error('Fallback full fetch after 304 failed:', fallbackError);
        return {
          data: [],
          isFromCache: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Fallback fetch failed',
        };
      }
    }

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
    // Persist ETag for this query
    const newEtag = response.headers?.etag || response.headers?.ETag;
    if (newEtag) {
      etags[etagKey] = newEtag as string;
      await saveEtagStore();
    }
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
    const etags = await loadEtagStore();
    const etagKey = `/strains:paginated:${JSON.stringify(formattedParams)}`;
    const ifNoneMatch = etags[etagKey];
    logger.log(`[DEBUG] Fetching paginated strains with params:`, formattedParams);
    const response = await requestWithRetry<
      AxiosResponse<{ items: RawStrainApiResponse[]; total_count: number; page: number; page_size: number; total_pages: number; } | RawStrainApiResponse[] | ApiResponseArray>
    >(() =>
      axiosInstance.get<{ items: RawStrainApiResponse[]; total_count: number; page: number; page_size: number; total_pages: number; } | RawStrainApiResponse[] | ApiResponseArray>('/strains', {
        params: formattedParams,
        headers: ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : undefined,
        validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
      })
    );

    if (response.status === 304 && cachedData) {
      logger.log('[DEBUG] 304 Not Modified - serving cached paginated data');
      return { data: cachedData, isFromCache: true };
    }

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
    const newEtag = response.headers?.etag || response.headers?.ETag;
    if (newEtag) {
      etags[etagKey] = newEtag as string;
      await saveEtagStore();
    }
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
