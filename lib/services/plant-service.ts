import supabase from '../supabase';
import { BaseService, ApiResponse, createService } from './service-factory';
import { Plant, GrowthStage } from '../types/plant';

/**
 * Service for managing plant-related operations
 */
export class PlantService extends BaseService {
  /**
   * Adapts a database plant record to our frontend Plant model
   */
  private adaptPlantFromDB(dbPlant: any): Plant {
    return {
      id: dbPlant.id,
      user_id: dbPlant.user_id,
      name: dbPlant.name,
      strain: dbPlant.strain || '',
      growth_stage: (dbPlant.stage as GrowthStage) || 'seedling',
      planted_date: dbPlant.planted_date || new Date().toISOString(),
      location_id: dbPlant.location_id,
      journal_id: dbPlant.journal_id,
      created_at: dbPlant.created_at,
      updated_at: dbPlant.updated_at,
    };
  }

  /**
   * Adapts our frontend Plant model to database format
   */
  private adaptPlantToDB(plant: Partial<Plant>): Record<string, any> {
    const dbPlant: Record<string, any> = {};

    if (plant.user_id) dbPlant.user_id = plant.user_id;
    if (plant.name) dbPlant.name = plant.name;
    if (plant.strain) dbPlant.strain = plant.strain;
    if (plant.growth_stage) dbPlant.stage = plant.growth_stage;
    if (plant.planted_date) dbPlant.planted_date = plant.planted_date;
    if (plant.location_id) dbPlant.location_id = plant.location_id;
    if (plant.journal_id) dbPlant.journal_id = plant.journal_id;

    return dbPlant;
  }

  /**
   * Fetches all plants for a user
   */
  async getPlants(user_id: string): Promise<ApiResponse<Plant[]>> {
    try {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) return this.wrapResponse<Plant[]>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Plant[]>(
        (data || []).map((plant) => this.adaptPlantFromDB(plant)),
        null
      );
    } catch (error) {
      return this.wrapResponse<Plant[]>([], this.handleError(error));
    }
  }

  /**
   * Fetches a single plant by ID
   */
  async getPlantById(plantId: string): Promise<ApiResponse<Plant>> {
    try {
      const { data, error } = await supabase.from('plants').select('*').eq('id', plantId).single();

      if (error) return this.wrapResponse<Plant>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Plant>(this.adaptPlantFromDB(data), null);
    } catch (error) {
      return this.wrapResponse<Plant>(null, this.handleError(error));
    }
  }

  /**
   * Creates a new plant
   */
  async createPlant(
    plant: Omit<Plant, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<Plant>> {
    try {
      const dbPlant = this.adaptPlantToDB(plant);

      const { data, error } = await supabase.from('plants').insert([dbPlant]).select().single();

      if (error) return this.wrapResponse<Plant>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Plant>(this.adaptPlantFromDB(data), null);
    } catch (error) {
      return this.wrapResponse<Plant>(null, this.handleError(error));
    }
  }

  /**
   * Updates an existing plant
   */
  async updatePlant(plantId: string, updates: Partial<Plant>): Promise<ApiResponse<Plant>> {
    try {
      const dbUpdates = this.adaptPlantToDB(updates);

      const { data, error } = await supabase
        .from('plants')
        .update(dbUpdates)
        .eq('id', plantId)
        .select()
        .single();

      if (error) return this.wrapResponse<Plant>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Plant>(this.adaptPlantFromDB(data), null);
    } catch (error) {
      return this.wrapResponse<Plant>(null, this.handleError(error));
    }
  }

  /**
   * Deletes a plant
   */
  async deletePlant(plantId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase.from('plants').delete().eq('id', plantId);

      if (error) return this.wrapResponse<boolean>(false, this.handleSupabaseError(error));
      return this.wrapResponse<boolean>(true, null);
    } catch (error) {
      return this.wrapResponse<boolean>(false, this.handleError(error));
    }
  }
}

// Export singleton instance
export const plantService = createService(PlantService);

// Export adapter functions for backwards compatibility
export const adaptPlantFromDB = (dbPlant: any): Plant => plantService['adaptPlantFromDB'](dbPlant);
export const adaptPlantToDB = (plant: Partial<Plant>): Record<string, any> =>
  plantService['adaptPlantToDB'](plant);

// Export service methods with legacy function signatures for backwards compatibility
export const getPlants = async (userId: string): Promise<Plant[]> => {
  const response = await plantService.getPlants(userId);
  return response.data || [];
};

export const getPlantById = async (plantId: string): Promise<Plant | null> => {
  const response = await plantService.getPlantById(plantId);
  return response.data;
};

export const createPlant = async (
  plant: Omit<Plant, 'id' | 'created_at' | 'updated_at'>
): Promise<Plant | null> => {
  const response = await plantService.createPlant(plant);
  return response.data;
};

export const updatePlant = async (
  plantId: string,
  updates: Partial<Plant>
): Promise<Plant | null> => {
  const response = await plantService.updatePlant(plantId, updates);
  return response.data;
};

export const deletePlant = async (plantId: string): Promise<boolean> => {
  const response = await plantService.deletePlant(plantId);
  return response.data || false;
};
