import { useState, useEffect } from 'react';
import { Profile } from '../types/user';
import { getProfile, updateProfile, getProfileStats } from '../services/profile-service';
import { useAuth } from '../contexts/AuthProvider';

/**
 * Hook for managing user profile data
 */
export function useProfileData(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{
    plantsCount: number;
    postsCount: number;
    followersCount: number;
    followingCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  
  // Determine which user ID to use
  const targetUserId = userId || (user ? user.id : null);

  // Load profile data
  useEffect(() => {
    if (!targetUserId) {
      setProfile(null);
      setStats(null);
      setLoading(false);
      return;
    }

    async function loadProfileData() {
      setLoading(true);
      try {
        // Load profile
        const profileData = await getProfile(targetUserId);
        setProfile(profileData);
        
        // Load profile stats
        const statsData = await getProfileStats(targetUserId);
        setStats(statsData);
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load profile'));
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, [targetUserId]);

  // Update profile
  const updateUserProfile = async (updates: Partial<Profile>) => {
    if (!targetUserId) return null;

    try {
      const updatedProfile = await updateProfile(targetUserId, updates);

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      return updatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'));
      return null;
    }
  };

  return {
    profile,
    stats,
    loading,
    error,
    updateProfile: updateUserProfile,
    refresh: async () => {
      if (targetUserId) {
        setLoading(true);
        const profileData = await getProfile(targetUserId);
        const statsData = await getProfileStats(targetUserId);
        setProfile(profileData);
        setStats(statsData);
        setLoading(false);
      }
    }
  };
}
