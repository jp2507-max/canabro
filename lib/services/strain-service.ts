import supabase from '../supabase';
import { Strain, StrainReview } from '../types/strain';

/**
 * Adapts a database strain record to our frontend Strain model
 */
export function adaptStrainFromDB(dbStrain: any): Strain {
  return {
    id: dbStrain.id,
    api_id: dbStrain.api_id, // Add this line
    name: dbStrain.name,
    species: dbStrain.species,
    thc_content: dbStrain.thc_content,
    cbd_content: dbStrain.cbd_content,
    description: dbStrain.description,
    effects: dbStrain.effects || [],
    flavors: dbStrain.flavors || [],
    difficulty: dbStrain.grow_difficulty,
    flowering_time: dbStrain.flowering_time,
    image_url: dbStrain.image_url,
    origin: dbStrain.origin,
    yield_indoor: dbStrain.yield_indoor,
    yield_outdoor: dbStrain.yield_outdoor,
    medical_uses: dbStrain.medical_uses || [],
    negative_effects: dbStrain.negative_effects || [],
    growing_tips: dbStrain.growing_tips,
    breeder: dbStrain.breeder,
    is_auto_flower: dbStrain.is_auto_flower,
    is_feminized: dbStrain.is_feminized,
    height_indoor: dbStrain.height_indoor,
    height_outdoor: dbStrain.height_outdoor,
    created_at: dbStrain.created_at,
    updated_at: dbStrain.updated_at,
  };
}

/**
 * Fetches all strains with optional search
 */
export async function getStrains({
  search = '',
  page = 1,
  limit = 20,
  species = '',
}: {
  search?: string;
  page?: number;
  limit?: number;
  species?: string;
} = {}): Promise<{
  strains: Strain[];
  total: number;
  hasMore: boolean;
}> {
  try {
    let query = supabase
      .from('strains')
      .select('*', { count: 'exact' })
      .order('name')
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (species) {
      query = query.eq('species', species);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      strains: (data || []).map(adaptStrainFromDB),
      total: count || 0,
      hasMore: count ? page * limit < count : false,
    };
  } catch (error) {
    console.error('Error fetching strains:', error);
    return { strains: [], total: 0, hasMore: false };
  }
}

/**
 * Fetches a single strain by ID
 */
export async function getStrainById(strainId: string): Promise<Strain | null> {
  try {
    const { data, error } = await supabase.from('strains').select('*').eq('id', strainId).single();

    if (error) throw error;
    return adaptStrainFromDB(data);
  } catch (error) {
    console.error('Error fetching strain:', error);
    return null;
  }
}

/**
 * Fetches strain reviews
 */
export async function getStrainReviews(
  strainId: string,
  page = 1,
  limit = 10
): Promise<{
  reviews: StrainReview[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const { data, count, error } = await supabase
      .from('strain_reviews')
      .select('*, profiles!strain_reviews_user_id_fkey(username, avatar_url)', { count: 'exact' })
      .eq('strain_id', strainId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const reviews = (data || []).map((review) => ({
      id: review.id,
      strain_id: review.strain_id,
      user_id: review.user_id,
      rating: review.rating,
      title: review.title,
      content: review.content,
      effects_rating: review.effects_rating,
      grow_rating: review.grow_rating,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user: {
        id: review.user_id,
        username: review.profiles?.username || 'Anonymous',
        avatarUrl: review.profiles?.avatar_url,
      },
    }));

    return {
      reviews,
      total: count || 0,
      hasMore: count ? page * limit < count : false,
    };
  } catch (error) {
    console.error('Error fetching strain reviews:', error);
    return { reviews: [], total: 0, hasMore: false };
  }
}

/**
 * Adds a strain review
 */
export async function addStrainReview(
  review: Omit<StrainReview, 'id' | 'created_at' | 'updated_at'>
): Promise<StrainReview | null> {
  try {
    const { data, error } = await supabase
      .from('strain_reviews')
      .insert([
        {
          strain_id: review.strain_id,
          user_id: review.user_id,
          rating: review.rating,
          content: review.content,
          title: review.title,
          effects_rating: review.effects_rating,
          grow_rating: review.grow_rating,
        },
      ])
      .select(
        'id, strain_id, user_id, rating, title, content, effects_rating, grow_rating, created_at, updated_at'
      )
      .single();

    if (error) throw error;

    // Update the strain's average rating
    await supabase.rpc('update_strain_rating', {
      p_strain_id: review.strain_id,
    });

    return {
      id: data.id,
      strain_id: data.strain_id,
      user_id: data.user_id,
      rating: data.rating,
      title: data.title,
      content: data.content,
      effects_rating: data.effects_rating,
      grow_rating: data.grow_rating,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error adding strain review:', error);
    return null;
  }
}
