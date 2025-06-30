import supabase from '../supabase';
import { BaseService, ApiResponse, createService } from './service-factory';
import { DiagnosisResult, PlantProblemType } from '../types/diagnosis';

/**
 * Service for plant diagnosis and problem identification
 */
export class DiagnosisService extends BaseService {
  /**
   * Analyze a plant image to identify problems
   * This is a placeholder that will eventually use TensorFlow.js
   */
  async analyzeImage(imageUri: string, userId: string): Promise<ApiResponse<DiagnosisResult>> {
    try {
      // In a real implementation, this would:
      // 1. Upload the image to Supabase storage
      // 2. Process the image with TensorFlow.js
      // 3. Return diagnosis results

      // For now, we'll simulate a response
      const mockDiagnosis: DiagnosisResult = {
        id: `diag-${Date.now()}`,
        user_id: userId,
        image_url: imageUri,
        created_at: new Date().toISOString(),
        confidence: 0.85,
        problem_type: 'nutrient_deficiency' as PlantProblemType,
        details: {
          name: 'Nitrogen Deficiency',
          description:
            'The plant appears to be suffering from nitrogen deficiency, characterized by yellowing of older leaves starting from the tips.',
          severity: 'moderate',
          recommendations: [
            'Apply a nitrogen-rich fertilizer',
            'Ensure proper pH (6.0-7.0) for optimal nutrient absorption',
            'Consider adding compost or other organic matter to the soil',
          ],
        },
      };

      // In a real implementation, we would save the diagnosis to Supabase
      // const { data, error } = await supabase
      //   .from('plant_diagnoses')
      //   .insert([mockDiagnosis])
      //   .select()
      //   .single();

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return this.wrapResponse<DiagnosisResult>(mockDiagnosis, null);
    } catch (error) {
      return this.wrapResponse<DiagnosisResult>(null, this.handleError(error));
    }
  }

  /**
   * Upload an image to Supabase storage
   */
  async uploadImage(imageUri: string, userId: string): Promise<ApiResponse<string>> {
    try {
      // Create a unique filename
      const fileExt = imageUri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `diagnosis/${userId}/${fileName}`;

      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error } = await supabase.storage.from('plant-images').upload(filePath, blob); // data is unused

      if (error) {
        // Create a string error message as expected by wrapResponse
        const errorMessage = `Storage upload failed: ${error.message || 'Unknown error'}`;
        return this.wrapResponse<string>(null, errorMessage);
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage.from('plant-images').getPublicUrl(filePath);

      return this.wrapResponse<string>(publicUrlData.publicUrl, null);
    } catch (error) {
      return this.wrapResponse<string>(null, this.handleError(error));
    }
  }

  /**
   * Save a diagnosis result to the database
   */
  async saveDiagnosis(diagnosis: DiagnosisResult): Promise<ApiResponse<DiagnosisResult>> {
    try {
      const { data, error } = await supabase
        .from('plant_diagnoses')
        .insert([diagnosis])
        .select()
        .single();

      if (error) return this.wrapResponse<DiagnosisResult>(null, this.handleSupabaseError(error));
      return this.wrapResponse<DiagnosisResult>(data as DiagnosisResult, null);
    } catch (error) {
      return this.wrapResponse<DiagnosisResult>(null, this.handleError(error));
    }
  }

  /**
   * Get diagnosis history for a user
   */
  async getDiagnosisHistory(userId: string): Promise<ApiResponse<DiagnosisResult[]>> {
    try {
      const { data, error } = await supabase
        .from('plant_diagnoses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return this.wrapResponse<DiagnosisResult[]>(null, this.handleSupabaseError(error));
      return this.wrapResponse<DiagnosisResult[]>(data as DiagnosisResult[], null);
    } catch (error) {
      return this.wrapResponse<DiagnosisResult[]>([], this.handleError(error));
    }
  }
}

// Export singleton instance
export const diagnosisService = createService(DiagnosisService);

// Export service methods with legacy function signatures for backwards compatibility
export const analyzeImage = async (
  imageUri: string,
  userId: string
): Promise<DiagnosisResult | null> => {
  const response = await diagnosisService.analyzeImage(imageUri, userId);
  return response.data;
};

export const uploadImage = async (imageUri: string, userId: string): Promise<string | null> => {
  const response = await diagnosisService.uploadImage(imageUri, userId);
  return response.data;
};

export const saveDiagnosis = async (
  diagnosis: DiagnosisResult
): Promise<DiagnosisResult | null> => {
  const response = await diagnosisService.saveDiagnosis(diagnosis);
  return response.data;
};

export const getDiagnosisHistory = async (userId: string): Promise<DiagnosisResult[]> => {
  const response = await diagnosisService.getDiagnosisHistory(userId);
  return response.data || [];
};
