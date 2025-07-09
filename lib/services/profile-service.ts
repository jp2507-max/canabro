import supabase from '../supabase';
import { BaseService, ApiResponse, createService } from './service-factory';
import { Profile } from '../types/user';

/**
 * Service for managing user profiles
 */
export class ProfileService extends BaseService {
  /**
   * Fetches a user profile by ID
   */
  async getProfile(userId: string): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) return this.wrapResponse<Profile>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Profile>(data as Profile, null);
    } catch (error) {
      return this.wrapResponse<Profile>(null, this.handleError(error));
    }
  }

  /**
   * Creates a new user profile
   */
  async createProfile(profile: Partial<Profile>): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase.from('profiles').insert([profile]).select().single();

      if (error) return this.wrapResponse<Profile>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Profile>(data as Profile, null);
    } catch (error) {
      return this.wrapResponse<Profile>(null, this.handleError(error));
    }
  }

  /**
   * Updates an existing user profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) return this.wrapResponse<Profile>(null, this.handleSupabaseError(error));
      return this.wrapResponse<Profile>(data as Profile, null);
    } catch (error) {
      return this.wrapResponse<Profile>(null, this.handleError(error));
    }
  }

  /**
   * Gets profile statistics (plants count, posts count, etc.) in a single optimized query
   */
  async getProfileStats(userId: string): Promise<
    ApiResponse<{
      plantsCount: number;
      postsCount: number;
      followersCount: number;
      followingCount: number;
    }>
  > {
    type StatsType = {
      plantsCount: number;
      postsCount: number;
      followersCount: number;
      followingCount: number;
    };

    try {
      // Using a more efficient approach with parallel promises
      const [plantsResult, postsResult, followersResult, followingResult] = await Promise.all([
        supabase.from('plants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        Promise.all([
          supabase.from('community_questions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('community_plant_shares').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        ]).then(([q, ps]) => ({
          error: q.error || ps.error || null,
          count: (q.count || 0) + (ps.count || 0),
        })),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);

      // Check for errors in any of the queries
      const errorResults = [
        { name: 'plants', error: plantsResult.error },
        { name: 'posts', error: postsResult.error },
        { name: 'followers', error: followersResult.error },
        { name: 'following', error: followingResult.error },
      ].filter((result) => result.error);

      if (errorResults.length > 0) {
        const errors = errorResults.map((e) => `${e.name}: ${e.error?.message}`).join(', ');
        return this.wrapResponse<StatsType>(null, `Error fetching profile statistics: ${errors}`);
      }

      const stats: StatsType = {
        plantsCount: plantsResult.count || 0,
        postsCount: postsResult.count || 0,
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
      };

      return this.wrapResponse<StatsType>(stats, null);
    } catch (error) {
      return this.wrapResponse<StatsType>(null, this.handleError(error));
    }
  }
}

// Export singleton instance
export const profileService = createService(ProfileService);

// Export service methods with legacy function signatures for backwards compatibility
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const response = await profileService.getProfile(userId);
  return response.data;
};

export const createProfile = async (profile: Partial<Profile>): Promise<Profile | null> => {
  const response = await profileService.createProfile(profile);
  return response.data;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> => {
  const response = await profileService.updateProfile(userId, updates);
  return response.data;
};

export const getProfileStats = async (
  userId: string
): Promise<{
  plantsCount: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
} | null> => {
  const response = await profileService.getProfileStats(userId);
  return response.data;
};
