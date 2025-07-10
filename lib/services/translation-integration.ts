/**
 * Translation Integration Service
 * 
 * Wraps WeedDbService methods with automatic translation middleware
 * for German localization of strain data. Provides seamless drop-in
 * replacement that preserves all original functionality while adding
 * translation capabilities when German locale is active.
 */

import { WeedDbService } from './weed-db.service';
import { translateStrainData } from './translation-service';
import i18n from '../config/i18n';
import { logger } from '../config/production';
import type { Strain, CachedResponse, PaginatedCachedResponse } from '../types/weed-db';

/**
 * Enhanced WeedDbService with automatic translation support
 * All methods preserve original signatures while adding translation layer
 */
export class TranslatedWeedDbService {
  /**
   * Check if German translation should be applied
   */
  private static shouldTranslate(): boolean {
    return i18n.language === 'de';
  }

  /**
   * Apply translation to single strain if needed
   */
  private static async translateSingleStrain(strain: Strain): Promise<Strain> {
    if (!this.shouldTranslate()) return strain;
    
    try {
      return translateStrainData(strain as Strain & { [key: string]: unknown });
    } catch (error) {
      logger.warn('Failed to translate strain data', { strainId: strain.id, error });
      return strain; // Fallback to original data
    }
  }

  /**
   * Apply translation to cached response of strains if needed
   */
  private static async translateCachedResponse(
    response: CachedResponse<Strain[]>
  ): Promise<CachedResponse<Strain[]>> {
    if (!this.shouldTranslate()) return response;
    
    try {
      const translatedData = response.data.map(strain => 
        translateStrainData(strain as Strain & { [key: string]: unknown })
      ) as Strain[];
      
      return {
        ...response,
        data: translatedData
      };
    } catch (error) {
      logger.warn('Failed to translate cached response', { 
        count: response.data.length, 
        error 
      });
      return response; // Fallback to original data
    }
  }

  /**
   * Apply translation to paginated cached response if needed
   */
  private static async translatePaginatedResponse(
    response: PaginatedCachedResponse<Strain>
  ): Promise<PaginatedCachedResponse<Strain>> {
    if (!this.shouldTranslate()) return response;
    
    try {
      const translatedItems = response.data.items.map(strain => 
        translateStrainData(strain as Strain & { [key: string]: unknown })
      ) as Strain[];
      
      return {
        ...response,
        data: {
          ...response.data,
          items: translatedItems
        }
      };
    } catch (error) {
      logger.warn('Failed to translate paginated response', { 
        count: response.data.items.length, 
        error 
      });
      return response; // Fallback to original data
    }
  }

  /**
   * Fetches a paginated list of strains with translation
   */
  static async list(page = 1, limit = 50): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.list(page, limit);
    return this.translateCachedResponse(response);
  }

  /**
   * Fetches a specific strain by its ID with translation
   */
  static async getById(id: string): Promise<Strain | null> {
    const strain = await WeedDbService.getById(id);
    if (!strain) return null;
    
    return this.translateSingleStrain(strain);
  }

  /**
   * Search strains by name with translation
   */
  static async searchByName(name: string): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.searchByName(name);
    return this.translateCachedResponse(response);
  }

  /**
   * Search strains by name with translation (alias)
   */
  static async search(query: string): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.search(query);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by grow difficulty with translation
   */
  static async filterByGrowDifficulty(
    level: 'easy' | 'medium' | 'difficult'
  ): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.filterByGrowDifficulty(level);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by effect with translation
   */
  static async filterByEffect(effect: string): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.filterByEffect(effect);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by flavor with translation
   */
  static async filterByFlavor(flavor: string): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.filterByFlavor(flavor);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by THC content range with translation
   */
  static async filterByThc(min: number, max: number): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.filterByThc(min, max);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by parent strain name with translation
   */
  static async filterByParent(parentName: string): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.filterByParent(parentName);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by type with translation
   */
  static async filterByType(type: 'sativa' | 'indica' | 'hybrid'): Promise<CachedResponse<Strain[]>> {
    const response = await WeedDbService.filterByType(type);
    return this.translateCachedResponse(response);
  }

  /**
   * Filter strains by type with pagination and translation
   */
  static async filterByTypePaginated(
    type: 'sativa' | 'indica' | 'hybrid',
    page = 1,
    pageSize = 50
  ): Promise<PaginatedCachedResponse<Strain>> {
    const response = await WeedDbService.filterByTypePaginated(type, page, pageSize);
    return this.translatePaginatedResponse(response);
  }

  /**
   * Search for strains by name with pagination and translation
   */
  static async searchPaginated(
    query: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedCachedResponse<Strain>> {
    const response = await WeedDbService.searchPaginated(query, page, pageSize);
    return this.translatePaginatedResponse(response);
  }

  /**
   * Fetch a paginated list of strains with translation
   */
  static async listPaginated(page = 1, pageSize = 50): Promise<PaginatedCachedResponse<Strain>> {
    const response = await WeedDbService.listPaginated(page, pageSize);
    return this.translatePaginatedResponse(response);
  }

  /**
   * Get translation status and statistics
   */
  static getTranslationStats(): {
    isActive: boolean;
    language: string;
  } {
    return {
      isActive: this.shouldTranslate(),
      language: i18n.language,
    };
  }

  /**
   * Expose the original axios instance for custom requests
   */
  static get axiosInstance() {
    return WeedDbService.axiosInstance;
  }
}

// Export individual methods for named imports if preferred
export const {
  list,
  getById,
  searchByName,
  search,
  filterByGrowDifficulty,
  filterByEffect,
  filterByFlavor,
  filterByThc,
  filterByParent,
  filterByType,
  filterByTypePaginated,
  searchPaginated,
  listPaginated,
  getTranslationStats,
  axiosInstance
} = TranslatedWeedDbService;

// Default export for convenience
export default TranslatedWeedDbService;