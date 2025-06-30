/**
 * Represents the raw data structure for a strain received from the external API.
 */
export interface ApiStrain {
  id?: string; // Optional: The internal ID from the API, if different from api_id
  api_id: string; // The true external API ID (e.g., a MongoDB ObjectId or a UUID string)
  name: string;
  type?: string | null; // e.g., "sativa", "indica", "hybrid"
  genetics?: string | null; // e.g., "Sativa-dominant", "OG Kush x Durban Poison"
  description?: string | string[] | null;
  thc?: string | number | null; // Can be a range "15-20%" or a number or "Unknown"
  cbd?: string | number | null; // Can be a range "1-3%" or a number or "Low"
  floweringTime?: string | number | null; // e.g., "8-9 weeks" or a number of days/weeks
  floweringType?: string | null; // e.g., "Photoperiod", "Autoflower"
  image_url?: string | null;
  link?: string | null; // URL to the strain's page on the source API/website
  parents?: string[] | string | null; // Array of parent strain names or a single string
  terpenes?: string[] | string | null; // Array of terpene names or a single string
  effects?: string[] | string | null; // Array of effect names or a single string
  flavors?: string[] | string | null; // Array of flavor names or a single string

  // Additional potentially useful fields from various APIs
  breeder?: string | null;
  origin?: string[] | string | null; // Geographical origins
  yieldIndoor?: string | null; // e.g., "400-500g/m²"
  yieldOutdoor?: string | null; // e.g., "600g/plant"
  heightIndoor?: string | number | null; // e.g., "80-120cm" or "Medium"
  heightOutdoor?: string | number | null; // e.g., "150-250cm" or "Tall"
  growDifficulty?: string | null; // e.g., "Easy", "Medium", "Hard"
  harvestTimeOutdoor?: string | null; // e.g., "End of October"

  // It's good practice to allow for other potential fields
  [key: string]: any; // Allows for any other properties that might come from the API
}

/**
 * Type guard to check if an object is an ApiStrain.
 * This is a basic check and can be expanded based on required fields.
 * @param obj - The object to check.
 * @returns True if the object is an ApiStrain, false otherwise.
 */
export function isApiStrain(obj: any): obj is ApiStrain {
  return (
    obj && typeof obj.api_id === 'string' && typeof obj.name === 'string'
    // Add more checks for essential fields if necessary
  );
}
