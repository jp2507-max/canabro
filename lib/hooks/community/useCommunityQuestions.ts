import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import supabase from '../../supabase';
import type { CommunityQuestion, QuestionFilters, CreateQuestionData } from '../../types/community';

const PAGE_SIZE = 10;

/**
 * Hook for fetching community questions with infinite scroll and filtering
 */
export function useCommunityQuestions(filters: QuestionFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['community-questions', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_community_questions', {
        p_limit: PAGE_SIZE,
        p_offset: pageParam * PAGE_SIZE,
        p_category: filters.category || null,
        p_is_solved: filters.is_solved !== undefined ? filters.is_solved : null,
        p_order_by: filters.order_by || 'created_at',
        p_order_direction: filters.order_direction || 'DESC'
      });

      if (error) throw error;
      return data as CommunityQuestion[];
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
 * Hook for creating a new community question with optimistic updates
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateQuestionData) => {
      const { data: result, error } = await supabase
        .from('community_questions')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result as CommunityQuestion;
    },
    onSuccess: (newQuestion) => {
      // Invalidate and refetch questions
      queryClient.invalidateQueries({ queryKey: ['community-questions'] });
      
      // Optionally add to cache for immediate feedback
      queryClient.setQueryData(['community-questions'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: CommunityQuestion[], index: number) => 
            index === 0 ? [newQuestion, ...page] : page
          )
        };
      });
    },
    onError: (error) => {
      console.error('Error creating question:', error);
    }
  });
}

/**
 * Hook for liking/unliking community questions with optimistic updates
 */
export function useLikeQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, isLiked }: { questionId: string; isLiked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('community_question_likes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('community_question_likes')
          .insert([{
            question_id: questionId,
            user_id: user.id
          }]);
        
        if (error) throw error;
      }
    },
    onMutate: async ({ questionId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['community-questions'] });

      // Snapshot previous value
      const previousQuestions = queryClient.getQueryData(['community-questions']);

      // Optimistically update
      queryClient.setQueryData(['community-questions'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: CommunityQuestion[]) =>
            page.map((question) =>
              question.id === questionId
                ? {
                    ...question,
                    user_has_liked: !isLiked,
                    likes_count: isLiked ? question.likes_count - 1 : question.likes_count + 1
                  }
                : question
            )
          )
        };
      });

      return { previousQuestions };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousQuestions) {
        queryClient.setQueryData(['community-questions'], context.previousQuestions);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['community-questions'] });
    }
  });
}

/**
 * Hook for fetching a single community question by ID
 */
export function useCommunityQuestion(questionId: string) {
  return useQuery({
    queryKey: ['community-question', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (error) throw error;
      return data as CommunityQuestion;
    },
    enabled: !!questionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for updating question solved status
 */
export function useUpdateQuestionSolved() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, isSolved }: { questionId: string; isSolved: boolean }) => {
      const { data, error } = await supabase
        .from('community_questions')
        .update({ is_solved: isSolved })
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;
      return data as CommunityQuestion;
    },
    onSuccess: (updatedQuestion) => {
      // Update the question in cache
      queryClient.setQueryData(['community-questions'], (old: any) => {
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
      
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['community-questions'] });
    },
    onError: (error) => {
      console.error('Error updating question solved status:', error);
    }
  });
} 