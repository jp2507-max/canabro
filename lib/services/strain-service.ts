import supabase from '../supabase';
import { Strain, StrainReview } from '../types/strain';

/**
 * Adapts a database strain record to our frontend Strain model
 */
export function adaptStrainFromDB(dbStrain: any): Strain {
  return {
    id: dbStrain.id,
    name: dbStrain.name,
    species: dbStrain.species,
    thcContent: dbStrain.thc_content,
    cbdContent: dbStrain.cbd_content,
    description: dbStrain.description,
    effects: dbStrain.effects || [],
    flavors: dbStrain.flavors || [],
    growDifficulty: dbStrain.grow_difficulty,
    floweringTime: dbStrain.flowering_time,
    imageUrl: dbStrain.image_url,
    averageRating: dbStrain.average_rating || 0,
    reviewCount: dbStrain.review_count || 0,
    createdAt: new Date(dbStrain.created_at),
    updatedAt: new Date(dbStrain.updated_at)
  };
}

/**
 * Fetches all strains with optional search
 */
export async function getStrains({
  search = '',
  page = 1,
  limit = 20,
  species = ''
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
      hasMore: count ? (page * limit < count) : false
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
    const { data, error } = await supabase
      .from('strains')
      .select('*')
      .eq('id', strainId)
      .single();

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
export async function getStrainReviews(strainId: string, page = 1, limit = 10): Promise<{
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

    const reviews = (data || []).map(review => ({
      id: review.id,
      strainId: review.strain_id,
      userId: review.user_id,
      rating: review.rating,
      content: review.content,
      growExperience: review.grow_experience,
      effectsExperienced: review.effects_experienced || [],
      createdAt: new Date(review.created_at),
      user: {
        id: review.user_id,
        username: review.profiles?.username || 'Anonymous',
        avatarUrl: review.profiles?.avatar_url
      }
    }));

    return {
      reviews,
      total: count || 0,
      hasMore: count ? (page * limit < count) : false
    };
  } catch (error) {
    console.error('Error fetching strain reviews:', error);
    return { reviews: [], total: 0, hasMore: false };
  }
}

/**
 * Adds a strain review
 */
export async function addStrainReview(review: Omit<StrainReview, 'id' | 'createdAt' | 'user'>): Promise<StrainReview | null> {
  try {
    const { data, error } = await supabase
      .from('strain_reviews')
      .insert([{
        strain_id: review.strainId,
        user_id: review.userId,
        rating: review.rating,
        content: review.content,
        grow_experience: review.growExperience,
        effects_experienced: review.effectsExperienced
      }])
      .select('id', 'strain_id', 'user_id', 'rating', 'content', 'grow_experience', 'effects_experienced', 'created_at')
      .single();

    if (error) throw error;

    // Update the strain's average rating
    await supabase.rpc('update_strain_rating', {
      p_strain_id: review.strainId
    });

    return {
      id: data.id,
      strainId: data.strain_id,
      userId: data.user_id,
      rating: data.rating,
      content: data.content,
      growExperience: data.grow_experience,
      effectsExperienced: data.effects_experienced || [],
      createdAt: new Date(data.created_at),
      user: {
        id: data.user_id,
        username: '', // Will be fetched separately
        avatarUrl: ''
      }
    };
  } catch (error) {
    console.error('Error adding strain review:', error);
    return null;
  }
}
