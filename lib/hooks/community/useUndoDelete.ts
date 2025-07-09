/**
 * useUndoDelete - Hook for managing undo functionality after post deletion
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
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
  const { user } = useAuth();
  const [undoState, setUndoState] = useState<UndoDeleteState>({
    visible: false,
    postId: null,
    message: '',
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const restoreMutation = useRestorePost({
    onSuccess: () => {
      console.log('Post restored successfully');
    },
    onError: (error) => {
      console.error('Failed to restore post:', error);
      // TODO: Show error toast
    }
  });


  const AUTO_HIDE_DELAY = 5000; // 5 seconds

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

    // Set auto-hide timeout
    timeoutRef.current = setTimeout(() => {
      hideUndoToast();
    }, AUTO_HIDE_DELAY);
  }, [hideUndoToast]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleUndo = useCallback(async () => {
    if (!undoState.postId || !user?.id) return;

    try {
      await restoreMutation.mutateAsync({
        postId: undoState.postId,
        userId: user.id,
      });
      hideUndoToast();
    } catch (error) {
      console.error('Error undoing deletion:', error);
    }
  }, [undoState.postId, restoreMutation, hideUndoToast, user?.id]);

  return {
    undoState,
    showUndoToast,
    hideUndoToast,
    handleUndo,
    isUndoing: restoreMutation.isPending,
  };
}
