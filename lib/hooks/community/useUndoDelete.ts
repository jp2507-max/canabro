/**
 * useUndoDelete - Hook for managing undo functionality after post deletion
 */

import { useCallback, useState, useRef } from 'react';
import { useRestorePost } from './useDeletePost';

interface UndoDeleteState {
  visible: boolean;
  postId: string | null;
  message: string;
}

interface UseUndoDeleteReturn {
  undoState: UndoDeleteState;
  showUndoToast: (postId: string, message?: string) => void;
  hideUndoToast: () => void;
  handleUndo: () => void;
  isUndoing: boolean;
}

export function useUndoDelete(): UseUndoDeleteReturn {
  const [undoState, setUndoState] = useState<UndoDeleteState>({
    visible: false,
    postId: null,
    message: '',
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const restoreMutation = useRestorePost({
    onSuccess: () => {
      console.warn('Post restored successfully');
    },
    onError: (error) => {
      console.error('Failed to restore post:', error);
      // TODO: Show error toast
    }
  });

  const showUndoToast = useCallback((postId: string, message = 'Post deleted') => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setUndoState({
      visible: true,
      postId,
      message,
    });
  }, []);

  const hideUndoToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setUndoState({
      visible: false,
      postId: null,
      message: '',
    });
  }, []);

  const handleUndo = useCallback(async () => {
    if (!undoState.postId) return;

    try {
      await restoreMutation.mutateAsync({
        postId: undoState.postId,
        userId: '', // This will be provided by the calling component
      });
      hideUndoToast();
    } catch (error) {
      console.error('Error undoing deletion:', error);
    }
  }, [undoState.postId, restoreMutation, hideUndoToast]);

  return {
    undoState,
    showUndoToast,
    hideUndoToast,
    handleUndo,
    isUndoing: restoreMutation.isPending,
  };
}
