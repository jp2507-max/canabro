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
 * Updates the translation middleware configuration with the provided options.
 *
 * Merges the given partial configuration into the current middleware settings.
 *
 * @param config - Partial configuration options to override the current middleware settings
 */
export function configureTranslationMiddleware(config: Partial<TranslationMiddlewareConfig>): void {
  middlewareConfig = { ...middlewareConfig, ...config };
}

/**
 * Determines whether the provided data object contains any fields eligible for strain translation.
 *
 * Returns `true` if the object has at least one of the translatable strain fields: `type`, `effects`, `flavors`, `growDifficulty`, or `description`.
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
 * Translates the strain data in a single API response if translation is enabled and applicable.
 *
 * If translation is not enabled or the response data is not translatable, returns the original response. On translation errors, either returns the original response or rethrows the error based on configuration.
 *
 * @returns The API response with translated strain data if applicable
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
 * Translates an array of strain data objects within an API response if translation is enabled.
 *
 * If translation is disabled or the response data is not an array, returns the original response. Errors during translation are logged and, depending on configuration, either the original response is returned or the error is rethrown.
 *
 * @returns The API response with translated strain data array if applicable
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
 * Translates the `items` array within a paginated strain API response if translation is enabled.
 *
 * If translation is disabled or the response does not contain items, returns the original response. On translation errors, either returns the original response or rethrows the error based on configuration.
 *
 * @returns The paginated API response with translated strain items if applicable.
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
 * Translates strain-related data in an API response by detecting its structure and applying the appropriate translation function.
 *
 * If the response contains a paginated list, an array, or a single strain object, the corresponding translation is performed. Returns the original response if translation is disabled, not applicable, or if an error occurs and error translation is disabled.
 *
 * @returns The translated API response, or the original response if translation is not performed.
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
 * Returns a wrapped version of an asynchronous API function that automatically translates its response using the translation middleware.
 *
 * The wrapper intercepts the API function's response and applies translation logic if applicable. Errors during the API call or translation are logged and rethrown.
 *
 * @returns The wrapped API function with automatic response translation
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
 * Translates an array of API responses, applying translation to each response if enabled.
 *
 * If translation is disabled or the input is not an array, returns the original responses. Errors during translation are logged; depending on configuration, either the original responses are returned or the error is rethrown.
 *
 * @param responses - The array of API responses to translate
 * @returns The array of translated API responses, or the original array if translation is not applied
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
 * Returns a copy of the current translation middleware configuration.
 *
 * @returns The current middleware configuration object.
 */
export function getTranslationMiddlewareConfig(): TranslationMiddlewareConfig {
  return { ...middlewareConfig };
}

/**
 * Resets the translation middleware configuration to its default settings.
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
