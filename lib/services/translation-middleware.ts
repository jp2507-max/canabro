/**
 * Translation Middleware for API Responses
 * 
 * Intercepts API responses and applies translations to strain data
 * before passing to components. Handles caching and error recovery.
 */

import translationService from './translation-service';
import { logger } from '../config/production';

/**
 * Interface for strain data that can be translated
 */
interface TranslatableStrainData {
  type?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: string;
  description?: string | string[];
  [key: string]: unknown;
}

/**
 * API Response types that can contain strain data
 */
type ApiResponse<T = unknown> = {
  data: T;
  error?: string | null;
  isFromCache?: boolean;
  [key: string]: unknown;
};

/**
 * Paginated API Response type
 */
type PaginatedApiResponse<T = unknown> = {
  data: {
    items: T[];
    total_count: number;
    page: number;
    page_size: number;
    total_pages: number;
    hasMore?: boolean;
  };
  error?: string | null;
  isFromCache?: boolean;
};

/**
 * Configuration for translation middleware
 */
interface TranslationMiddlewareConfig {
  enableTranslation: boolean;
  enableCaching: boolean;
  translateOnError: boolean;
  logTranslations: boolean;
}

const defaultConfig: TranslationMiddlewareConfig = {
  enableTranslation: true,
  enableCaching: true,
  translateOnError: false,
  logTranslations: false,
};

let middlewareConfig = { ...defaultConfig };

/**
 * Configure translation middleware
 */
export function configureTranslationMiddleware(config: Partial<TranslationMiddlewareConfig>): void {
  middlewareConfig = { ...middlewareConfig, ...config };
}

/**
 * Check if data contains translatable strain fields
 */
function isTranslatableStrainData(data: unknown): data is TranslatableStrainData {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  return !!(
    obj.type ||
    obj.effects ||
    obj.flavors ||
    obj.growDifficulty ||
    obj.description
  );
}

/**
 * Middleware function for single strain API responses
 */
export function translateStrainApiResponse<T extends TranslatableStrainData>(
  response: ApiResponse<T>
): ApiResponse<T> {
  if (!middlewareConfig.enableTranslation || !response?.data) {
    return response;
  }
  
  try {
    if (isTranslatableStrainData(response.data)) {
      const translatedData = translationService.translateStrainData(response.data);
      
      if (middlewareConfig.logTranslations) {
        logger.log('Translated strain data:', {
          original: response.data,
          translated: translatedData,
        });
      }
      
      return {
        ...response,
        data: translatedData,
      };
    }
    
    return response;
  } catch (error) {
    logger.error('Error in translateStrainApiResponse:', error);
    
    // Return original response on error if configured to do so
    if (!middlewareConfig.translateOnError) {
      return response;
    }
    
    throw error;
  }
}

/**
 * Middleware function for strain array API responses
 */
export function translateStrainsApiResponse<T extends TranslatableStrainData>(
  response: ApiResponse<T[]>
): ApiResponse<T[]> {
  if (!middlewareConfig.enableTranslation || !response?.data || !Array.isArray(response.data)) {
    return response;
  }
  
  try {
    const translatedData = response.data.map(item => {
      if (isTranslatableStrainData(item)) {
        return translationService.translateStrainData(item);
      }
      return item;
    });
    
    if (middlewareConfig.logTranslations) {
      logger.log('Translated strains array:', {
        originalCount: response.data.length,
        translatedCount: translatedData.length,
      });
    }
    
    return {
      ...response,
      data: translatedData,
    };
  } catch (error) {
    logger.error('Error in translateStrainsApiResponse:', error);
    
    if (!middlewareConfig.translateOnError) {
      return response;
    }
    
    throw error;
  }
}

/**
 * Middleware function for paginated strain API responses
 */
export function translatePaginatedStrainsApiResponse<T extends TranslatableStrainData>(
  response: PaginatedApiResponse<T>
): PaginatedApiResponse<T> {
  if (!middlewareConfig.enableTranslation || !response?.data?.items) {
    return response;
  }
  
  try {
    const translatedItems = response.data.items.map(item => {
      if (isTranslatableStrainData(item)) {
        return translationService.translateStrainData(item);
      }
      return item;
    });
    
    if (middlewareConfig.logTranslations) {
      logger.log('Translated paginated strains:', {
        page: response.data.page,
        originalCount: response.data.items.length,
        translatedCount: translatedItems.length,
      });
    }
    
    return {
      ...response,
      data: {
        ...response.data,
        items: translatedItems,
      },
    };
  } catch (error) {
    logger.error('Error in translatePaginatedStrainsApiResponse:', error);
    
    if (!middlewareConfig.translateOnError) {
      return response;
    }
    
    throw error;
  }
}

/**
 * Generic middleware that detects response type and applies appropriate translation
 */
export function translateApiResponse(response: unknown): unknown {
  if (!middlewareConfig.enableTranslation || !response) {
    return response;
  }
  
  try {
    // Handle paginated responses
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      response.data &&
      typeof response.data === 'object' &&
      'items' in response.data &&
      Array.isArray((response.data as { items: unknown[] }).items)
    ) {
      return translatePaginatedStrainsApiResponse(response as PaginatedApiResponse<TranslatableStrainData>);
    }
    
    // Handle array responses
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray((response as { data: unknown[] }).data)
    ) {
      return translateStrainsApiResponse(response as ApiResponse<TranslatableStrainData[]>);
    }
    
    // Handle single object responses
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      isTranslatableStrainData((response as { data: unknown }).data)
    ) {
      return translateStrainApiResponse(response as ApiResponse<TranslatableStrainData>);
    }
    
    return response;
  } catch (error) {
    logger.error('Error in translateApiResponse:', error);
    
    if (!middlewareConfig.translateOnError) {
      return response;
    }
    
    throw error;
  }
}

/**
 * Utility to create a translation wrapper for API functions
 */
export function createTranslationWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  apiFunction: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const response = await apiFunction(...args);
      return translateApiResponse(response);
    } catch (error) {
      logger.error('Error in translation wrapper:', error);
      throw error;
    }
  }) as T;
}

/**
 * Batch translation utility for multiple API responses
 */
export function translateBatchApiResponses<T = unknown>(responses: T[]): T[] {
  if (!middlewareConfig.enableTranslation || !Array.isArray(responses)) {
    return responses;
  }
  
  try {
    return responses.map(response => translateApiResponse(response) as T);
  } catch (error) {
    logger.error('Error in translateBatchApiResponses:', error);
    
    if (!middlewareConfig.translateOnError) {
      return responses;
    }
    
    throw error;
  }
}

/**
 * Get current middleware configuration
 */
export function getTranslationMiddlewareConfig(): TranslationMiddlewareConfig {
  return { ...middlewareConfig };
}

/**
 * Reset middleware configuration to defaults
 */
export function resetTranslationMiddlewareConfig(): void {
  middlewareConfig = { ...defaultConfig };
}

/**
 * Middleware utilities for development and debugging
 */
export const TranslationMiddlewareUtils = {
  isTranslatableStrainData,
  configureTranslationMiddleware,
  getTranslationMiddlewareConfig,
  resetTranslationMiddlewareConfig,
  createTranslationWrapper,
  translateBatchApiResponses,
} as const;

export default {
  translateStrainApiResponse,
  translateStrainsApiResponse,
  translatePaginatedStrainsApiResponse,
  translateApiResponse,
  createTranslationWrapper,
  TranslationMiddlewareUtils,
};
