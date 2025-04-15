import axios from 'axios';
import {
  TheCannabisApiStrain,
  TheCannabisApiStrainsResponse,
  TheCannabisApiEffectsResponse,
  TheCannabisApiFlavorsResponse,
  TheCannabisApiAllTagsResponse,
} from '../types/the-cannabis-api';

const API_BASE_URL =
  'https://the-cannabis-ayix5e7fr-piyush-bhors-projects.vercel.app/api/strains';

/**
 * Fetches strains by type (indica, sativa, hybrid).
 * @param strainType - The type of strain to fetch.
 * @returns A promise resolving to an array of strains.
 */
export async function getStrainsByType(
  strainType: 'indica' | 'sativa' | 'hybrid'
): Promise<TheCannabisApiStrainsResponse> {
  try {
    const response = await axios.get<TheCannabisApiStrainsResponse>(
      `${API_BASE_URL}/getStrainsByType/${strainType}`
    );
    // The API might return a single object if only one matches, ensure array format
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    console.error(`Error fetching strains by type ${strainType}:`, error);
    // Return empty array or throw error based on desired handling
    return [];
  }
}

/**
 * Fetches a specific strain by its ID (_id field).
 * @param strainId - The MongoDB ObjectId of the strain.
 * @returns A promise resolving to the strain data.
 */
export async function getStrainById(
  strainId: string
): Promise<TheCannabisApiStrain | null> {
  try {
    // Note: API docs mention :strainID, assuming it means the _id field
    const response = await axios.get<TheCannabisApiStrain>(
      `${API_BASE_URL}/getStrainsById/${strainId}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching strain by ID ${strainId}:`, error);
    return null; // Or throw
  }
}

/**
 * Fetches strains by name.
 * @param strainName - The name of the strain to search for.
 * @returns A promise resolving to an array of matching strains.
 */
export async function getStrainsByName(
  strainName: string
): Promise<TheCannabisApiStrainsResponse> {
  try {
    const response = await axios.get<TheCannabisApiStrainsResponse>(
      `${API_BASE_URL}/getStrainsByName/${encodeURIComponent(strainName)}`
    );
     // The API might return a single object if only one matches, ensure array format
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    console.error(`Error fetching strains by name ${strainName}:`, error);
    return [];
  }
}


/**
 * Fetches effects for a specific strain by its ID.
 * @param strainId - The MongoDB ObjectId of the strain.
 * @returns A promise resolving to an array of effect strings.
 */
export async function getEffectsByStrainId(
  strainId: string
): Promise<TheCannabisApiEffectsResponse> {
  try {
    const response = await axios.get<TheCannabisApiEffectsResponse>(
      `${API_BASE_URL}/getEffectsByStrainId/${strainId}`
    );
    // Assuming the API returns { effects: ["effect1", "effect2"] }
    // Adjust based on actual API response structure if different
    // If it directly returns ["effect1", "effect2"], use response.data directly
    return (response.data as any)?.effects || response.data || [];
  } catch (error) {
    console.error(`Error fetching effects for strain ID ${strainId}:`, error);
    return [];
  }
}

/**
 * Fetches flavors for a specific strain by its ID.
 * @param strainId - The MongoDB ObjectId of the strain.
 * @returns A promise resolving to an array of flavor strings.
 */
export async function getFlavorsByStrainId(
  strainId: string
): Promise<TheCannabisApiFlavorsResponse> {
  try {
    const response = await axios.get<TheCannabisApiFlavorsResponse>(
      `${API_BASE_URL}/getFlavoursByStrainId/${strainId}` // Note: API uses 'Flavours'
    );
     // Assuming the API returns { flavors: ["flavor1", "flavor2"] }
    // Adjust based on actual API response structure if different
    // If it directly returns ["flavor1", "flavor2"], use response.data directly
    return (response.data as any)?.flavor || response.data || []; // API might use 'flavor' field based on strain type
  } catch (error) {
    console.error(`Error fetching flavors for strain ID ${strainId}:`, error);
    return [];
  }
}

/**
 * Fetches all unique flavors available in the dataset.
 * @returns A promise resolving to an array of all flavor strings.
 */
export async function getAllFlavors(): Promise<TheCannabisApiAllTagsResponse> {
    try {
        const response = await axios.get<TheCannabisApiAllTagsResponse>(`${API_BASE_URL}/getAllFlavours`); // Note: API uses 'Flavours'
        return response.data || [];
    } catch (error) {
        console.error("Error fetching all flavors:", error);
        return [];
    }
}

/**
 * Fetches all unique effects available in the dataset.
 * @returns A promise resolving to an array of all effect strings.
 */
export async function getAllEffects(): Promise<TheCannabisApiAllTagsResponse> {
    try {
        const response = await axios.get<TheCannabisApiAllTagsResponse>(`${API_BASE_URL}/getAllEffects`);
        return response.data || [];
    } catch (error) {
        console.error("Error fetching all effects:", error);
        return [];
    }
}

// Add functions for getStrainsByEffect and getStrainsByFlavour if needed later for filtering
