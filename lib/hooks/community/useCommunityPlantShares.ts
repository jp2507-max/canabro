import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import supabase from '../../supabase';
import type { CommunityPlantShare, PlantShareFilters, CreatePlantShareData } from '../../types/community';

const PAGE_SIZE = 10;

/**
 * Hook for fetching community plant shares with infinite scroll and filtering
 */
export function useCommunityPlantShares(filters: PlantShareFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['community-plant-shares', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_community_plant_shares', {
        p_limit: PAGE_SIZE,
        p_offset: pageParam * PAGE_SIZE,
        p_growth_stage: filters.growth_stage || null,
        p_environment: filters.environment || null,
        p_order_by: filters.order_by || 'created_at',
        p_order_direction: filters.order_direction || 'DESC'
      });

      if (error) throw error;
      return data as CommunityPlantShare[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for creating a new community plant share with optimistic updates
 */
export function useCreatePlantShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlantShareData) => {
      const { data: result, error } = await supabase
        .from('community_plant_shares')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result as CommunityPlantShare;
    },
    onSuccess: (newPlantShare) => {
      queryClient.invalidateQueries({ queryKey: ['community-plant-shares'] });
      
      queryClient.setQueryData(['community-plant-shares'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: CommunityPlantShare[], index: number) => 
            index === 0 ? [newPlantShare, ...page] : page
          )
        };
      });
    },
    onError: (error) => {
      console.error('Error creating plant share:', error);
    }
  });
}

/**
 * Hook for liking/unliking community plant shares with optimistic updates
 */
export function useLikePlantShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plantShareId, isLiked }: { plantShareId: string; isLiked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (isLiked) {
        const { error } = await supabase
          .from('community_plant_share_likes')
          .delete()
          .eq('plant_share_id', plantShareId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('community_plant_share_likes')
          .insert([{
            plant_share_id: plantShareId,
            user_id: user.id
          }]);
        
        if (error) throw error;
      }
    },
    onMutate: async ({ plantShareId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['community-plant-shares'] });

      const previousPlantShares = queryClient.getQueryData(['community-plant-shares']);

      queryClient.setQueryData(['community-plant-shares'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: CommunityPlantShare[]) =>
            page.map((plantShare) =>
              plantShare.id === plantShareId
                ? {
                    ...plantShare,
                    user_has_liked: !isLiked,
                    likes_count: isLiked ? plantShare.likes_count - 1 : plantShare.likes_count + 1
                  }
                : plantShare
            )
          )
        };
      });

      return { previousPlantShares };
    },
    onError: (err, variables, context) => {
      if (context?.previousPlantShares) {
        queryClient.setQueryData(['community-plant-shares'], context.previousPlantShares);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community-plant-shares'] });
    }
  });
}

/**
 * Hook for fetching a single community plant share by ID
 */
export function useCommunityPlantShare(plantShareId: string) {
  return useQuery({
    queryKey: ['community-plant-share', plantShareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_plant_shares')
        .select('*')
        .eq('id', plantShareId)
        .single();

      if (error) throw error;
      return data as CommunityPlantShare;
    },
    enabled: !!plantShareId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for updating plant share featured status
 */
export function useUpdatePlantShareFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plantShareId, isFeatured }: { plantShareId: string; isFeatured: boolean }) => {
      const { data, error } = await supabase
        .from('community_plant_shares')
        .update({ is_featured: isFeatured })
        .eq('id', plantShareId)
        .select()
        .single();

      if (error) throw error;
      return data as CommunityPlantShare;
    },
    onSuccess: (updatedPlantShare) => {
      // Update the plant share in cache
      queryClient.setQueryData(['community-plant-shares'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: CommunityPlantShare[]) =>
            page.map((plantShare) =>
              plantShare.id === updatedPlantShare.id ? updatedPlantShare : plantShare
            )
          )
        };
      });
      
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['community-plant-shares'] });
    },
    onError: (error) => {
      console.error('Error updating plant share featured status:', error);
    }
  });
} 