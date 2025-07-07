import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import supabase from '../../supabase';
import type { CommunityQuestion, CommunityPlantShare } from '../../types/community';
import { 
  validateCommunityQuestion, 
  validateCommunityPlantShare, 
  validatePayloadWithId 
} from '../../utils/community-validators';

/**
 * Type aliases for TanStack Query infinite data structures
 */
type CommunityQuestionsData = InfiniteData<CommunityQuestion[], unknown>;
type CommunityPlantSharesData = InfiniteData<CommunityPlantShare[], unknown>;

/**
 * Hook for real-time community questions updates
 */
export function useRealtimeCommunityQuestions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('community-questions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_questions'
        },
        (payload) => {
          const newQuestion = validateCommunityQuestion(payload);
          
          if (!newQuestion) {
            console.warn('[useRealtimeCommunityQuestions] Invalid question payload received, skipping cache update');
            return;
          }
          
          // Add to cache
          queryClient.setQueryData(['community-questions'], (old: CommunityQuestionsData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: CommunityQuestion[], index: number) => 
                index === 0 ? [newQuestion, ...page] : page
              )
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_questions'
        },
        (payload) => {
          const updatedQuestion = validateCommunityQuestion(payload);
          
          if (!updatedQuestion) {
            console.warn('[useRealtimeCommunityQuestions] Invalid question update payload received, skipping cache update');
            return;
          }
          
          // Update in cache
          queryClient.setQueryData(['community-questions'], (old: CommunityQuestionsData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: CommunityQuestion[]) =>
                page.map((question) =>
                  question.id === updatedQuestion.id ? updatedQuestion : question
                )
              )
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_questions'
        },
        (payload) => {
          const deletedQuestion = validatePayloadWithId(payload, 'DELETE');
          
          if (!deletedQuestion) {
            console.warn('[useRealtimeCommunityQuestions] Invalid question delete payload received, skipping cache update');
            return;
          }
          
          // Remove from cache
          queryClient.setQueryData(['community-questions'], (old: CommunityQuestionsData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: CommunityQuestion[]) =>
                page.filter((question) => question.id !== deletedQuestion.id)
              )
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook for real-time community plant shares updates
 */
export function useRealtimeCommunityPlantShares() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('community-plant-shares')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_plant_shares'
        },
        (payload) => {
          const newPlantShare = validateCommunityPlantShare(payload);
          
          if (!newPlantShare) {
            console.warn('[useRealtimeCommunityPlantShares] Invalid plant share payload received, skipping cache update');
            return;
          }
          
          queryClient.setQueryData(['community-plant-shares'], (old: CommunityPlantSharesData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: CommunityPlantShare[], index: number) => 
                index === 0 ? [newPlantShare, ...page] : page
              )
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_plant_shares'
        },
        (payload) => {
          const updatedPlantShare = validateCommunityPlantShare(payload);
          
          if (!updatedPlantShare) {
            console.warn('[useRealtimeCommunityPlantShares] Invalid plant share update payload received, skipping cache update');
            return;
          }
          
          queryClient.setQueryData(['community-plant-shares'], (old: CommunityPlantSharesData | undefined) => {
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_plant_shares'
        },
        (payload) => {
          const deletedPlantShare = validatePayloadWithId(payload, 'DELETE');
          
          if (!deletedPlantShare) {
            console.warn('[useRealtimeCommunityPlantShares] Invalid plant share delete payload received, skipping cache update');
            return;
          }
          
          queryClient.setQueryData(['community-plant-shares'], (old: CommunityPlantSharesData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: CommunityPlantShare[]) =>
                page.filter((plantShare) => plantShare.id !== deletedPlantShare.id)
              )
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook for real-time question likes updates
 */
export function useRealtimeQuestionLikes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('community-question-likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_question_likes'
        },
        (_payload) => {
          // Invalidate questions to refresh like counts
          queryClient.invalidateQueries({ queryKey: ['community-questions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook for real-time plant share likes updates
 */
export function useRealtimePlantShareLikes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('community-plant-share-likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_plant_share_likes'
        },
        (_payload) => {
          // Invalidate plant shares to refresh like counts
          queryClient.invalidateQueries({ queryKey: ['community-plant-shares'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Combined hook for all community real-time updates
 */
export function useRealtimeCommunity() {
  useRealtimeCommunityQuestions();
  useRealtimeCommunityPlantShares();
  useRealtimeQuestionLikes();
  useRealtimePlantShareLikes();
} 