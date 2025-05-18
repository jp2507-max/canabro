import { Strain } from '../../types/strain';
import supabase from '../../supabase';

/**
 * Ensures a strain exists in Supabase before syncing a plant.
 * If the strain does not exist, it will be created.
 * Returns the strain id if successful, or null if failed.
 */
export async function ensureStrainExistsForSync(strain: Strain): Promise<string | null> {
  console.log('[Sync] ensureStrainExistsForSync called with strain:', 
    strain ? JSON.stringify({id: strain.id, name: strain.name}) : 'undefined strain');
    
  if (!strain?.id || !strain.name) {
    console.error('[Sync] Strain missing id or name:', strain);
    return null;
  }

  // Check if strain exists by id
  try {
    const { data: existing, error: checkError, status: checkStatus } = await supabase
      .from('strains')
      .select('id')
      .eq('id', strain.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Sync] Error checking strain existence:', checkError, 'Status:', checkStatus);
      return null;
    }
    if (existing?.id) {
      console.log('[Sync] Strain already exists in Supabase:', existing.id);
      return existing.id;
    }
    console.log('[Sync] Strain does not exist in Supabase yet, will create:', strain.id);
  } catch (queryError) {
    console.error('[Sync] Exception during strain existence check:', queryError);
    return null;
  } 
  // Define a list of known safe fields to reduce chances of schema errors
  // Update this list if the database schema changes
  const KNOWN_STRAIN_FIELDS = [
    'id', 
    'name', 
    'type', 
    'description', 
    'thc_percentage', 
    'cbd_percentage', 
    'grow_difficulty',
    'effects', 
    'flavors', 
    'created_at',
    'updated_at',
    'created_by',
    'average_yield',
    'flowering_time',
    'api_id',
    'image_url',
    'genetics',
    'height_indoor',
    'height_outdoor',
    'harvest_time_outdoor',
    'flowering_type'
  ];

  /**
   * Creates a safe payload for Supabase upsert operations
   * by filtering out fields that aren't known to exist in the schema
   */
  function createSafeStrainPayload(strain: Strain): Record<string, any> {
    // Start with a base payload with required fields
    const safePayload: Record<string, any> = {
      id: strain.id,
      name: strain.name,
    };    
    
    // Map of common field name variations to their standardized DB column names
    const fieldMappings: Record<string, string[]> = {
      'type': ['type', 'species', 'strainType'], 
      'thc_percentage': ['thc_content', 'thc', 'thcContent', 'thcPercentage', 'THC'],
      'cbd_percentage': ['cbd_content', 'cbd', 'cbdContent', 'cbdPercentage', 'CBD'],
      'grow_difficulty': ['grow_difficulty', 'growDifficulty', 'difficulty', 'growDifficulty'],
      'created_at': ['created_at', 'createdAt'],
      'updated_at': ['updated_at', 'updatedAt'],
      'flowering_time': ['flowering_time', 'floweringTime'],
      'average_yield': ['average_yield', 'yield', 'averageYield'],
      'image_url': ['image_url', 'imageUrl', 'image'],
      'api_id': ['api_id', 'apiId', '_id', 'originalId'],
      'genetics': ['genetics'],
      'height_indoor': ['height_indoor', 'heightIndoor'],
      'height_outdoor': ['height_outdoor', 'heightOutdoor'],
      'harvest_time_outdoor': ['harvest_time_outdoor', 'harvestTimeOutdoor'],
      'flowering_type': ['flowering_type', 'floweringType']
    };
    
    // Strictly only add fields that are in our known list
    for (const dbField of KNOWN_STRAIN_FIELDS) {
      // Skip id and name as they're already handled
      if (dbField === 'id' || dbField === 'name') continue;
      
      // For fields with known variations, check all possible source properties
      if (fieldMappings[dbField]) {
        for (const sourceField of fieldMappings[dbField]) {
          if ((strain as any)[sourceField] !== undefined) {
            safePayload[dbField] = (strain as any)[sourceField];
            break;
          }
        }
      }
      // For direct matches and arrays (effects, flavors)
      else if ((strain as any)[dbField] !== undefined) {
        safePayload[dbField] = (strain as any)[dbField];
      }
    }
    
    return safePayload;
  }
  // Map incoming fields to Supabase schema (only using fields confirmed to exist in the DB)
  const insertPayload = createSafeStrainPayload(strain);
  
  // Convert thcContent to thc_percentage if needed
  if ((strain as any).thcContent !== undefined && insertPayload.thc_percentage === undefined) {
    insertPayload.thc_percentage = (strain as any).thcContent;
  }

  // Convert cbdContent to cbd_percentage if needed
  if ((strain as any).cbdContent !== undefined && insertPayload.cbd_percentage === undefined) {
    insertPayload.cbd_percentage = (strain as any).cbdContent;
  }
  
  // Log only known fields in payload for debugging
  console.log('[Sync] Upserting strain with safe payload:', JSON.stringify(insertPayload, null, 2));
  console.log('[Sync] Safe payload has', Object.keys(insertPayload).length, 'fields:', Object.keys(insertPayload).join(', '));
  console.log('[Sync] Original strain object keys:', Object.keys(strain).join(', '));
  
  // Use upsert to avoid race conditions and handle existing records
  const { error: upsertError, data: upsertData, status: upsertStatus } = await supabase
    .from('strains')
    .upsert([insertPayload], { onConflict: 'id' })
    .select();

  if (upsertError) {
    console.error('[Sync] Error upserting strain:', upsertError, 'Status:', upsertStatus, 'Payload:', insertPayload);
    return null;
  }
  if (upsertData && upsertData.length > 0) {
    console.log('[Sync] Strain upserted successfully:', upsertData);
  } else {
    console.warn('[Sync] Strain upsert returned no data:', upsertData);
  }
  return strain.id;
}
