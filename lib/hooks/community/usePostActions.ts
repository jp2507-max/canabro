/**
 * usePostActions - Custom hook for common post interaction patterns
 * Eliminates duplicate haptic feedback and action handling logic
 */

import { useCallback } from 'react';
import { triggerLightHapticSync } from '../../utils/haptics';

interface UsePostActionsProps {
  postId: string;
  userId: string;
  isLiked: boolean;
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onPress?: (postId: string) => void;
}

export function usePostActions({
  postId,
  userId,
  isLiked,
  onLike,
  onComment,
  onUserPress,
  onPress,
}: UsePostActionsProps) {
  const handleLike = useCallback(() => {
    triggerLightHapticSync();
    onLike(postId, isLiked);
  }, [postId, isLiked, onLike]);

  const handleComment = useCallback(() => {
    triggerLightHapticSync();
    onComment(postId);
  }, [postId, onComment]);

  const handleUserPress = useCallback(() => {
    onUserPress(userId);
  }, [userId, onUserPress]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(postId);
    }
  }, [postId, onPress]);

  return {
    handleLike,
    handleComment,
    handleUserPress,
    handlePress,
  };
}
