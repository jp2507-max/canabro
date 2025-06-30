/**
 * FavoriteStrainService
 *
 * A service for managing user favorite strains in the local database
 * with robust error handling to prevent 'collections.has is not a function' errors
 */

import { Q, Collection } from '@nozbe/watermelondb';

import { database } from '../models';
import { FavoriteStrain } from '../models/FavoriteStrain';
import supabase from '../supabase';
import { isObjectId, isUuid, storeIdMapping } from '../utils/strainIdMapping';
import { ensureUuid } from '../utils/uuid';

/**
 * Safely gets the favorite_strains collection with error handling
 */
function getFavoritesCollection(): Collection<FavoriteStrain> | null {
  try {
    // First attempt: try direct get method on database
    if (database && typeof database.get === 'function') {
      try {
        return database.get<FavoriteStrain>('favorite_strains');
      } catch (error) {
        console.warn('[FavoriteStrainService] Could not get collection via database.get', error);
      }
    }

    // Second attempt: try collections property if available
    if (database && database.collections) {
      // Try get method on collections
      if (typeof database.collections.get === 'function') {
        try {
          return database.collections.get<FavoriteStrain>('favorite_strains');
        } catch (error) {
          console.warn(
            '[FavoriteStrainService] Could not get collection via collections.get',
            error
          );
        }
      }

      // Try direct property access - with explicit type assertion for safety
      // Note: This approach should be avoided if possible as it bypasses type safety
      const collections = database.collections as unknown as Record<
        string,
        Collection<FavoriteStrain>
      >;
      if (collections && collections['favorite_strains']) {
        return collections['favorite_strains'];
      }
    }

    throw new Error('Could not access favorite_strains collection by any method');
  } catch (error) {
    console.error('[FavoriteStrainService] Failed to access favorites collection:', error);
    // Replace Sentry with console.error for now
    // Sentry.captureException(error);
    return null;
  }
}

/**
 * Check if a strain is favorited by a user
 */
export async function isStrainFavorite(
  userId: string | null | undefined,
  strainId: string | null | undefined
): Promise<boolean> {
  if (!userId || !strainId) {
    return false;
  }

  try {
    const collection = getFavoritesCollection();
    if (!collection) {
      return false;
    }

    const favorites = await collection
      .query(Q.where('user_id', userId), Q.where('strain_id', strainId))
      .fetch();

    return favorites.length > 0;
  } catch (error) {
    console.error('[FavoriteStrainService] Error checking if strain is favorite:', error);
    // Replace Sentry with console.error for now
    // Sentry.captureException(error);
    return false;
  }
}

/**
 * Ensures a strain exists in Supabase before favoriting
 * This resolves foreign key constraint issues between API strains and Supabase favorites
 */
async function ensureStrainExistsInSupabase(
  strainId: string,
  strainData: {
    name?: string;
    type?: string;
    description?: string | string[];
    effects?: string[];
    flavors?: string[];
    image?: string;
    originalId?: string; // MongoDB ObjectId if available
    // Add additional strain data fields
    thc?: string | number;
    cbd?: string | number;
    growDifficulty?: string;
    floweringTime?: string;
    yieldIndoor?: string;
    yieldOutdoor?: string;
    heightIndoor?: string;
    heightOutdoor?: string;
    harvestTimeOutdoor?: string;
    genetics?: string;
    floweringType?: string;
  } = {}
): Promise<string | null> {
  try {
    // Generate a UUID for the strain ID
    const uuidStrainId = ensureUuid(strainId);
    if (!uuidStrainId) {
      console.error('[FavoriteStrainService] Could not generate UUID for strain:', strainId);
      return null;
    }

    // Determine the MongoDB ObjectId, either directly or from strainData
    const mongoObjectId = isObjectId(strainId) ? strainId : strainData.originalId;

    // Store mapping if we have both UUID and ObjectId
    if (mongoObjectId && uuidStrainId && isObjectId(mongoObjectId) && isUuid(uuidStrainId)) {
      storeIdMapping(uuidStrainId, mongoObjectId);
    }

    console.log('[DEBUG] Ensuring strain exists:', {
      originalId: mongoObjectId || strainId,
      uuid: uuidStrainId,
      name: strainData.name,
    });

    // Step 1: Check if strain already exists by ID
    const { data: existingStrainById, error: checkError } = await supabase
      .from('strains')
      .select('id')
      .eq('id', uuidStrainId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[DEBUG] Error checking if strain exists by ID:', checkError);
    }

    // If strain already exists by ID, return its UUID
    if (existingStrainById) {
      console.log('[DEBUG] Strain already exists in Supabase by ID:', existingStrainById);
      return uuidStrainId;
    }

    // Step 2: If not found by ID, check if it exists by name
    if (strainData.name) {
      const { data: existingStrainByName, error: nameError } = await supabase
        .from('strains')
        .select('id, name')
        .ilike('name', strainData.name)
        .maybeSingle();

      if (nameError) {
        console.error('[DEBUG] Error checking if strain exists by name:', nameError);
      } else if (existingStrainByName?.id) {
        console.log('[DEBUG] Found strain by name instead of ID:', existingStrainByName);
        return existingStrainByName.id;
      }
    }

    // Step 3: If not found by ID or name, create it
    console.log('[DEBUG] Creating strain in Supabase with ID:', uuidStrainId);

    // Helper function to format description from string or array
    const formatDescription = (desc?: string | string[]): string | null => {
      if (!desc) return null;
      if (Array.isArray(desc)) return desc.join('\n\n');
      return desc;
    };

    // Helper function to parse percentage values
    const parsePercentage = (value?: string | number): number | null => {
      if (value === null || value === undefined || value === 'Unknown') return null;

      if (typeof value === 'number') return value;

      // Extract numbers from strings like "22%" or "15-20%"
      const match = String(value).match(/(\d+(?:\.\d+)?)/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }

      return null;
    };

    // Helper function to extract flowering time in weeks
    const extractFloweringTimeInWeeks = (value?: string): number | null => {
      if (!value) return null;

      // Handle ranges like "7-8 weeks"
      const match = value.match(/(\d+)(?:-(\d+))?\s*weeks?/i);
      if (match) {
        // For ranges, use the upper bound if available
        if (match[2]) return parseInt(match[2], 10);
        if (match[1]) return parseInt(match[1], 10);
        return null;
      }

      return null;
    };

    const { data: insertData, error: insertError } = await supabase
      .from('strains')
      .insert({
        id: uuidStrainId,
        name: strainData.name || 'Unknown Strain',
        type: strainData.type || null,
        effects: strainData.effects || null,
        flavors: strainData.flavors || null,
        description: formatDescription(strainData.description),
        api_id: mongoObjectId || null,
        // Process additional strain data
        thc_percentage: parsePercentage(strainData.thc),
        cbd_percentage: parsePercentage(strainData.cbd),
        grow_difficulty: strainData.growDifficulty || null,
        average_yield:
          strainData.yieldIndoor && strainData.yieldOutdoor
            ? `Indoor: ${strainData.yieldIndoor}, Outdoor: ${strainData.yieldOutdoor}`
            : strainData.yieldIndoor || strainData.yieldOutdoor || null,
        flowering_time: extractFloweringTimeInWeeks(strainData.floweringTime),
        image_url: strainData.image || null,
        genetics: strainData.genetics || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[DEBUG] Error creating strain:', insertError);

      // Step 4: If insert failed due to duplicate key, try to find by name again
      // This handles race conditions and edge cases
      if (insertError.code === '23505') {
        console.log('[DEBUG] Duplicate key error, searching for strain by name:', strainData.name);

        const { data: dupNameCheck } = await supabase
          .from('strains')
          .select('id, name')
          .ilike('name', strainData.name || 'Unknown Strain')
          .maybeSingle();

        if (dupNameCheck?.id) {
          console.log('[DEBUG] Found existing strain after duplicate key error:', dupNameCheck);
          return dupNameCheck.id;
        }
      }

      // Step 5: If the issue is RLS policy, try using RPC function
      if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
        console.log('[DEBUG] RLS policy violation, trying RPC function instead');

        try {
          const { data: lastResort, error: lastError } = await supabase.rpc(
            'ensure_strain_exists',
            {
              p_id: uuidStrainId,
              p_name: strainData.name || 'Unknown Strain',
              p_type: strainData.type || null,
            }
          );

          if (lastError) {
            console.error('[DEBUG] Final attempt to create strain failed:', lastError);

            // Step 6: Last resort - try to find ANY strain with matching name
            const { data: finalNameCheck } = await supabase
              .from('strains')
              .select('id')
              .ilike('name', strainData.name || 'Unknown Strain')
              .limit(1)
              .maybeSingle();

            if (finalNameCheck?.id) {
              console.log('[DEBUG] Found existing strain in final check:', finalNameCheck);
              return finalNameCheck.id;
            }

            return null;
          }

          console.log('[DEBUG] Created strain via RPC function:', lastResort);
          return uuidStrainId;
        } catch (finalError) {
          console.error('[DEBUG] All attempts to create strain failed:', finalError);
          return null;
        }
      }

      // Non-recoverable error
      return null;
    }

    console.log('[DEBUG] Successfully created strain:', insertData);
    return uuidStrainId;
  } catch (error) {
    console.error('[DEBUG] Error ensuring strain exists:', error);
    return null;
  }
}

/**
 * Add a strain to user's favorites in both WatermelonDB and Supabase
 */
export async function addFavoriteStrain(
  userId: string,
  strainId: string,
  strainData: {
    name?: string;
    type?: string;
    description?: string | string[];
    effects?: string[];
    flavors?: string[];
    image?: string;
    originalId?: string; // MongoDB ObjectId if different from strainId
    // Add additional strain data fields
    thc?: string | number;
    cbd?: string | number;
    growDifficulty?: string;
    floweringTime?: string;
    yieldIndoor?: string;
    yieldOutdoor?: string;
    heightIndoor?: string;
    heightOutdoor?: string;
    harvestTimeOutdoor?: string;
    genetics?: string;
    floweringType?: string;
  } = {}
): Promise<boolean> {
  if (!userId || !strainId) {
    console.error('[FavoriteStrainService] Missing userId or strainId');
    return false;
  }

  try {
    // Determine the MongoDB ObjectId
    // Priority: 1. strainData.originalId, 2. strainId if it's an ObjectId
    let mongoObjectId: string | undefined = undefined;

    if (strainData.originalId && isObjectId(strainData.originalId)) {
      // Case 1: originalId is provided and is a valid MongoDB ObjectId
      mongoObjectId = strainData.originalId;
      console.log('[DEBUG] Using provided originalId as MongoDB ObjectId:', mongoObjectId);
    } else if (isObjectId(strainId)) {
      // Case 2: strainId itself is a valid MongoDB ObjectId
      mongoObjectId = strainId;
      console.log('[DEBUG] Using strainId as MongoDB ObjectId:', mongoObjectId);
    } else {
      console.log('[DEBUG] No valid MongoDB ObjectId available for strain:', strainId);
    }

    // Store mapping if we have both UUID and ObjectId
    const uuidStrainId = ensureUuid(strainId);
    if (mongoObjectId && uuidStrainId && isObjectId(mongoObjectId) && isUuid(uuidStrainId)) {
      storeIdMapping(uuidStrainId, mongoObjectId);
      console.log('[DEBUG] Stored mapping between UUID and ObjectId:', {
        uuid: uuidStrainId,
        objectId: mongoObjectId,
      });
    }

    // Local database operation
    const collection = getFavoritesCollection();
    if (!collection) {
      throw new Error('Failed to get favorites collection');
    }

    // First, refresh the session to ensure we have valid credentials
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('[DEBUG] Failed to refresh auth session:', refreshError);
      throw new Error('Authentication refresh failed');
    }

    // Use the refreshed session
    const authUserId = refreshData.session?.user.id;
    if (!authUserId) {
      console.error('[DEBUG] No authenticated user found after refresh');
      throw new Error('Authentication verification failed');
    }

    // Ensure the userId matches the authenticated user's ID
    if (userId !== authUserId) {
      console.error('[DEBUG] User ID mismatch:', { providedId: userId, authUserId });
      throw new Error('User ID mismatch');
    }

    // Ensure the strain exists in Supabase before attempting to create a favorite
    const finalUuidStrainId = await ensureStrainExistsInSupabase(strainId, {
      name: strainData.name || 'Unknown Strain',
      type: strainData.type || 'hybrid',
      description: strainData.description,
      effects: strainData.effects,
      flavors: strainData.flavors,
      image: strainData.image,
      originalId: mongoObjectId,
      // Pass additional data
      thc: strainData.thc,
      cbd: strainData.cbd,
      growDifficulty: strainData.growDifficulty,
      floweringTime: strainData.floweringTime,
      yieldIndoor: strainData.yieldIndoor,
      yieldOutdoor: strainData.yieldOutdoor,
      heightIndoor: strainData.heightIndoor,
      heightOutdoor: strainData.heightOutdoor,
      harvestTimeOutdoor: strainData.harvestTimeOutdoor,
      genetics: strainData.genetics,
      floweringType: strainData.floweringType,
    });

    if (!finalUuidStrainId) {
      console.error(
        '[DEBUG] Failed to ensure strain exists in Supabase, aborting favorite operation'
      );
      return false;
    }

    console.log('[DEBUG] Adding favorite relation in Supabase:', {
      uuid: finalUuidStrainId,
      objectId: mongoObjectId || 'NONE',
    });

    // Then add the favorite relation in Supabase, explicitly including the strain_object_id field
    const upsertData: {
      user_id: string;
      strain_id: string;
      strain_object_id?: string;
      created_at: string;
    } = {
      user_id: authUserId,
      strain_id: finalUuidStrainId,
      created_at: new Date().toISOString(),
    };

    // Only add strain_object_id if we have a valid MongoDB ObjectId
    if (mongoObjectId && isObjectId(mongoObjectId)) {
      console.log('[DEBUG] Including ObjectId in Supabase record:', mongoObjectId);
      upsertData.strain_object_id = mongoObjectId;
    }

    const { data: favoriteData, error: favoriteError } = await supabase
      .from('user_favorite_strains')
      .upsert(upsertData)
      .select();

    if (favoriteError) {
      // If we still get an RLS error, try using the RPC approach as a fallback
      if (favoriteError.code === '42501') {
        console.log('[DEBUG] RLS policy error, trying with RPC function instead');
        try {
          const { data: rpcResult, error: rpcError } = await supabase.rpc('add_favorite_strain', {
            p_strain_id: finalUuidStrainId,
            p_created_at: new Date().toISOString(),
          });

          if (rpcError) {
            console.error('[DEBUG] RPC fallback also failed:', rpcError);
            return false;
          }

          console.log('[DEBUG] Successfully added favorite using RPC function:', rpcResult);
        } catch (rpcFallbackError) {
          console.error('[DEBUG] RPC fallback exception:', rpcFallbackError);
          return false;
        }
      } else {
        console.error('[DEBUG] Error adding favorite in Supabase:', favoriteError);
        return false;
      }
    } else {
      console.log('[DEBUG] Successfully added favorite in Supabase:', favoriteData);
    }

    // Check if already favorited locally to avoid duplicates
    const existing = await isStrainFavorite(userId, strainId);
    if (!existing) {
      // Add to local database
      await database.write(async () => {
        await collection.create((favorite: FavoriteStrain) => {
          favorite.userId = userId;
          favorite.strainId = strainId;
          // Note: We don't store the MongoDB ObjectId locally since it's a WatermelonDB limitation
          // But it's fine since we have it in Supabase
        });
      });
      console.log('[DEBUG] Added favorite to local database');
    } else {
      console.log('[DEBUG] Strain already favorited locally');
    }

    return true;
  } catch (error) {
    console.error('[DEBUG] Error adding favorite strain:', error);
    return false;
  }
}

/**
 * Remove a strain from user's favorites in both WatermelonDB and Supabase
 */
export async function removeFavoriteStrain(userId: string, strainId: string): Promise<boolean> {
  if (!userId || !strainId) {
    console.error('[FavoriteStrainService] Missing userId or strainId');
    return false;
  }

  try {
    // Local database operation
    const collection = getFavoritesCollection();
    if (!collection) {
      throw new Error('Failed to get favorites collection');
    }

    const favorites = await collection
      .query(Q.where('user_id', userId), Q.where('strain_id', strainId))
      .fetch();

    if (favorites.length === 0) {
      return true; // Nothing to remove, return success
    }

    await database.write(async () => {
      for (const favorite of favorites) {
        await favorite.destroyPermanently();
      }
    });

    // Sync with Supabase (with UUID conversion)
    try {
      const uuidStrainId = ensureUuid(strainId);
      if (uuidStrainId) {
        await supabase
          .from('user_favorite_strains')
          .delete()
          .match({ user_id: userId, strain_id: uuidStrainId });
      }
    } catch (supabaseError) {
      // Log Supabase error but don't fail the local operation
      console.error('[FavoriteStrainService] Supabase sync error:', supabaseError);
    }

    return true;
  } catch (error) {
    console.error('[FavoriteStrainService] Error removing favorite strain:', error);
    return false;
  }
}

/**
 * Get all favorite strains for a user
 */
export async function getUserFavoriteStrains(userId: string): Promise<string[]> {
  if (!userId) {
    return [];
  }

  try {
    const collection = getFavoritesCollection();
    if (!collection) {
      return [];
    }

    const favorites = await collection.query(Q.where('user_id', userId)).fetch();

    return favorites.map((favorite) => favorite.strainId);
  } catch (error) {
    console.error('[FavoriteStrainService] Error getting user favorite strains:', error);
    // Replace Sentry with console.error for now
    // Sentry.captureException(error);
    return [];
  }
}
