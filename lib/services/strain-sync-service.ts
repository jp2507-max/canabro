import supabase from '../supabase'; // Ensure Supabase client is imported (default import)

// Basic Strain type (consider using generated Supabase types if available)
interface Strain {
  id: string; // UUID
  api_id: string;
  name: string | null;
  type: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  description: string | null;
  flavors: string[] | null;
  effects: string[] | null;
  grow_difficulty: string | null;
  average_yield: string | null;
  flowering_time: number | null;
  flowering_type: string | null;
  genetics: string | null;
  height_indoor: string | null;
  height_outdoor: string | null;
  parents: string[] | null;
  harvest_time_outdoor: string | null;
  link: string | null;
  created_at?: string;
  updated_at?: string;
  // Add other fields from your Supabase 'strains' table
}

// Define RawApiStrainData interface for clarity and type safety
interface RawApiStrainData {
  id?: string; // Internal ID from selection context (e.g., "-3e024d3...")
  api_id: string; // True external API ID (e.g., "66a3c83...") - THIS IS MANDATORY
  _id?: string; // Fallback if direct API object uses _id as primary
  name?: string;
  type?: string; // e.g., indica, sativa, hybrid
  description?: string | string[];
  thc?: string | number; // Can be "22%", "15-20%", 22, or "Unknown"
  THC?: string | number; // API might use different casing
  cbd?: string | number; // Similar to THC
  CBD?: string | number; // API might use different casing
  genetics?: string;
  floweringTime?: string; // e.g., "7-8 weeks", "55 days"
  fromSeedToHarvest?: string; // Added for autoflowers like "9-10 weeks"
  floweringType?: string; // e.g., "Photoperiod", "Autoflower"
  growDifficulty?: string; // e.g., "Easy", "Moderate", "Hard"
  yieldIndoor?: string; // e.g., "400-500 g/m²"
  yieldOutdoor?: string; // e.g., "600 g/plant"
  heightIndoor?: string; // e.g., "80-120cm", "Medium"
  heightOutdoor?: string; // e.g., "150-250cm", "Tall"
  effects?: string[]; // Prioritize this, as seen in API logs
  flavors?: string[]; // Prioritize this, as seen in API logs
  parents?: string[]; // Added from Magnum example
  harvestTimeOutdoor?: string; // e.g., "October", "Late September"
  link?: string; // URL to the strain's page
  image?: string; // URL of the strain image - will not be stored in 'strains' table
  // Add any other relevant fields that might come from the API
}

// Helper function to parse percentage values (THC, CBD)
function parsePercentage(value?: string | number): number | null {
  if (value === null || value === undefined || String(value).toLowerCase() === "unknown") return null;
  if (typeof value === 'number') {
    return value;
  }

  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return null;
}

// Helper function to extract flowering time in weeks
function extractFloweringTimeInWeeks(value?: string): number | null {
  if (!value) {
    return null;
  }

  const weekMatch = String(value).match(/(\d+)(?:-(\d+))?\s*weeks?/i);
  if (weekMatch && weekMatch[1]) {
    // Use the first number in a range like "8-10 weeks"
    return parseInt(weekMatch[1], 10);
  }

  const dayMatch = String(value).match(/(\d+)\s*days?/i);
  if (dayMatch && dayMatch[1]) {
    const days = parseInt(dayMatch[1], 10);
    return Math.round(days / 7); // Convert days to weeks
  }

  return null;
}

// Helper function to format description
function formatDescription(desc?: string | string[]): string | null {
  if (!desc) {
    return null;
  }
  if (Array.isArray(desc)) {
    return desc.join('\n'); // Join array elements with a newline
  }
  return desc;
}

/**
 * Prepares strain data from the API for insertion or update into Supabase.
 * This function handles parsing, field mapping, and data type adjustments.
 * @param rawData The raw strain data from the API.
 * @returns An object suitable for Supabase 'strains' table, or null if critical data is missing.
 */
function prepareStrainDataForSupabase(rawData: RawApiStrainData): Partial<Strain> | null {
  const effectiveApiId = rawData.api_id || rawData._id;

  if (!effectiveApiId) {
    console.error('[StrainSyncService] Critical: Cannot determine effective API ID from rawData:', rawData);
    return null;
  }

  const supabaseData: Partial<Strain> = {
    api_id: effectiveApiId,
    name: rawData.name || null,
    type: rawData.type || null,
    description: formatDescription(rawData.description),
    thc_percentage: parsePercentage(rawData.thc || rawData.THC),
    cbd_percentage: parsePercentage(rawData.cbd || rawData.CBD),
    genetics: rawData.genetics || null,
    flowering_time: extractFloweringTimeInWeeks(rawData.floweringTime || rawData.fromSeedToHarvest),
    flowering_type: rawData.floweringType || null,
    grow_difficulty: rawData.growDifficulty || null,
    average_yield: rawData.yieldIndoor && rawData.yieldOutdoor
      ? `Indoor: ${rawData.yieldIndoor}, Outdoor: ${rawData.yieldOutdoor}`
      : (rawData.yieldIndoor || rawData.yieldOutdoor || null),
    height_indoor: rawData.heightIndoor || null,
    height_outdoor: rawData.heightOutdoor || null,
    effects: rawData.effects || null,
    flavors: rawData.flavors || null,
    parents: rawData.parents || null,
    harvest_time_outdoor: rawData.harvestTimeOutdoor || null,
    link: rawData.link || null,
    // Note: image_url is intentionally not mapped here
  };

  // Clean up properties that are explicitly undefined to avoid issues with Supabase.
  // Supabase client might handle undefined as no-change for updates, but explicit null is clearer.
  Object.keys(supabaseData).forEach(key => {
    const k = key as keyof typeof supabaseData;
    if (supabaseData[k] === undefined) {
      // @ts-ignore
      supabaseData[k] = null;
    }
  });
  
  console.log('[StrainSyncService] Data prepared for Supabase:', JSON.stringify(supabaseData, null, 2));
  return supabaseData;
}

/**
 * Finds or creates a strain in the local Supabase database based on an external API ID.
 * @param apiId The external API ID.
 * @param rawApiStrainData Optional raw API data to use if creating a new strain.
 * @returns A Promise that resolves to the found or created `Strain` object, or `null`.
 */
export async function findOrCreateLocalStrain(
  apiId: string,
  rawApiStrainData?: RawApiStrainData
): Promise<Strain | null> {
  if (!apiId) {
    console.error('[StrainSyncService] findOrCreateLocalStrain: apiId is required.');
    return null;
  }

  try {
    // First, try to find the strain by api_id
    const { data: existingStrain, error: findError } = await supabase
      .from('strains')
      .select('*')
      .eq('api_id', apiId)
      .maybeSingle();

    if (findError) {
      console.error('[StrainSyncService] Error finding strain by api_id:', apiId, findError);
      // Don't return null immediately, allow creation if find fails for some reason other than not found
    }

    if (existingStrain) {
      console.log('[StrainSyncService] Found existing strain in Supabase for api_id:', apiId);
      // Optionally, update if rawApiStrainData is provided and differs
      if (rawApiStrainData) {
        const preparedUpdateData = prepareStrainDataForSupabase(rawApiStrainData);
        if (preparedUpdateData) {
          // Basic check to see if an update is needed (can be more sophisticated)
          let needsUpdate = false;
          for (const key in preparedUpdateData) {
            if (preparedUpdateData[key as keyof Strain] !== existingStrain[key as keyof Strain]) {
              needsUpdate = true;
              break;
            }
          }
          if (needsUpdate) {
            console.log('[StrainSyncService] Updating existing strain in Supabase for api_id:', apiId);
            const { data: updatedStrain, error: updateError } = await supabase
              .from('strains')
              .update(preparedUpdateData)
              .eq('api_id', apiId)
              .select()
              .single();
            if (updateError) {
              console.error('[StrainSyncService] Error updating strain in Supabase:', updateError);
              return existingStrain; // Return existing if update fails
            }
            return updatedStrain;
          }
        }
      }
      return existingStrain;
    }

    // If not found, and rawApiStrainData is provided, create it
    if (!rawApiStrainData) {
      console.warn('[StrainSyncService] Strain not found for api_id and no data provided to create:', apiId);
      return null;
    }

    const preparedData = prepareStrainDataForSupabase(rawApiStrainData);
    if (!preparedData) {
      console.error('[StrainSyncService] Failed to prepare data for new strain with api_id:', apiId);
      return null;
    }

    console.log('[StrainSyncService] Creating new strain in Supabase for api_id:', apiId);
    const { data: newStrain, error: insertError } = await supabase
      .from('strains')
      .insert(preparedData)
      .select()
      .single();

    if (insertError) {
      console.error('[StrainSyncService] Error inserting new strain into Supabase:', insertError);
      return null;
    }

    console.log('[StrainSyncService] Successfully created new strain in Supabase:', newStrain);
    return newStrain;

  } catch (error) {
    console.error('[StrainSyncService] Unexpected error in findOrCreateLocalStrain:', error);
    return null;
  }
}

/**
 * Synchronizes a strain from an external API with the local Supabase database.
 * It uses `findOrCreateLocalStrain` to ensure the strain exists locally.
 * If the strain exists and `updateIfExists` is true, it updates the local strain.
 * @param apiId The external API ID of the strain.
 * @param rawApiStrainData The strain data from the external API.
 * @param updateIfExists If true, updates the local strain if it already exists. Defaults to true.
 * @returns A Promise that resolves to the synchronized `Strain` object, or `null`.
 */
export async function syncStrainFromApi(
  apiId: string,
  rawApiStrainData: RawApiStrainData,
  updateIfExists: boolean = true // Default to true, consistent with findOrCreateLocalStrain logic
): Promise<Strain | null> {
  if (!apiId || !rawApiStrainData) {
    console.error('[StrainSyncService] syncStrainFromApi: apiId and rawApiStrainData are required.');
    return null;
  }
  
  // Ensure the rawApiStrainData itself has the api_id consistent with the passed apiId parameter
  // This is a good safeguard.
  if (rawApiStrainData.api_id !== apiId && rawApiStrainData._id !== apiId) {
    console.warn(`[StrainSyncService] Mismatch between apiId parameter ('${apiId}') and api_id in rawApiStrainData ('${rawApiStrainData.api_id || rawApiStrainData._id}'). Using parameter.`);
    // Ensure the rawData passed to findOrCreate uses the explicit apiId parameter
    rawApiStrainData.api_id = apiId;
  }


  try {
    // findOrCreateLocalStrain now handles both finding, creating, and optionally updating if data is passed.
    // The `updateIfExists` logic is implicitly handled by passing rawApiStrainData to findOrCreateLocalStrain.
    // If `updateIfExists` is false, we might theoretically not pass rawApiStrainData if the strain exists,
    // but the current findOrCreateLocalStrain structure is more about "ensure it exists and is up-to-date if data is given".
    // For simplicity and to align with how findOrCreateLocalStrain is now structured,
    // we'll always pass the rawApiStrainData. If you need a strict "don't update if exists"
    // when updateIfExists is false, findOrCreateLocalStrain would need adjustment.
    
    return await findOrCreateLocalStrain(apiId, rawApiStrainData);

  } catch (error) {
    console.error(`[StrainSyncService] Error in syncStrainFromApi for api_id ${apiId}:`, error);
    return null;
  }
}
