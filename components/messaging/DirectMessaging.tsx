/**
 * DirectMessaging Component for Private Conversations
 * 
 * Features:
 * - Real-time message delivery with Supabase Realtime v2 and Broadcast API
 * - Message virtualization using FlashListWrapper with automatic sizing (v2)
 * - Error handling with existing errorHandler and custom logger
 * - Message status indicators with animation utilities
 * - Haptic feedback for message interactions
 * - Typing indicators and online presence with Presence v2
 * - Enhanced keyboard handling with EnhancedKeyboardWrapper
 * - Optimized message media loading with NetworkResilientImage
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';
import { View, Pressable, Alert, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Core utilities and components
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import NetworkResilientImage from '@/components/ui/NetworkResilientImage';
import { EnhancedKeyboardWrapper } from '@/components/keyboard/EnhancedKeyboardWrapper';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

// Animation and interaction utilities
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { useAnimationCleanup } from '@/lib/animations/useAnimationCleanup';
import * as haptics from '@/lib/utils/haptics';
import { globalErrorHandler, safeAsync } from '@/lib/utils/errorHandler';
import { log } from '@/lib/utils/logger';

// Services and models
import { realtimeService } from '@/lib/services/realtimeService';
import { Message, MessageReaction } from '@/lib/models/Message';
import useWatermelon from '@/lib/hooks/useWatermelon';
import { Q } from '@nozbe/watermelondb';

// Type for WatermelonDB message creation callback
interface MessageCreateRecord {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  messageType: string;
  attachments?: unknown[];
  replyTo?: string;
  reactions?: unknown[];
  isEdited: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  isDeleted?: boolean;
  lastSyncedAt?: Date;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// TypeScript interface for a plain message record from Supabase
export interface MessageRecord {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachments?: unknown[];
  reply_to?: string;
  reactions?: unknown[];
  is_edited: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
  is_deleted?: boolean;
  last_synced_at?: string | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

// Type guard for MessageRecord
function isMessageRecord(obj: unknown): obj is MessageRecord {
  if (!obj || typeof obj !== 'object') return false;
  
  const record = obj as Record<string, unknown>;
  return !!(
    typeof record.id === 'string' &&
    typeof record.thread_id === 'string' &&
    typeof record.sender_id === 'string' &&
    typeof record.content === 'string' &&
    typeof record.message_type === 'string' &&
    typeof record.sent_at === 'string' &&
    typeof record.created_at === 'string' &&
    typeof record.updated_at === 'string'
  );
}
import { ConversationThread } from '@/lib/models/ConversationThread';
import { UserPresence } from '@/lib/models/UserPresence';
import supabase from '@/lib/supabase';
import { useQuery, QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Types
export interface DirectMessagingProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  onClose?: () => void;
  className?: string;
}

export interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onPress?: () => void;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
}

export interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: Date;
}

export interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTyping: () => void;
  placeholder?: string;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

// Message status types
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Message Bubble Component with animations and interactions
 */
const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  isOwnMessage,
  onReaction,
  onReply,
  onPress,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    pressedScale: 0.98,
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: onPress,
  });

  const getMessageStatus = useCallback((): MessageStatus => {
    if (message.readAt) return 'read';
    if (message.deliveredAt) return 'delivered';
    if (message.sentAt || message.createdAt) return 'sent';
    return 'sending';
  }, [message.readAt, message.deliveredAt, message.sentAt, message.createdAt]);

  const formatTime = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }, []);

  const renderMessageStatus = useCallback(() => {
    if (!isOwnMessage) return null;

    const status = getMessageStatus();
    const iconName = {
      sending: 'loading1' as const,
      sent: 'checkmark' as const,
      delivered: 'checkmark-circle' as const,
      read: 'checkmark-circle' as const,
      failed: 'warning' as const,
    }[status];

    const iconColor = {
      sending: 'text-neutral-400',
      sent: 'text-neutral-500',
      delivered: 'text-primary-500',
      read: 'text-primary-600',
      failed: 'text-status-danger',
    }[status];

    return (
      <OptimizedIcon
        name={iconName}
        size={12}
        className={`ml-1 ${iconColor}`}
      />
    );
  }, [isOwnMessage, getMessageStatus]);

  const renderAttachments = useCallback(() => {
    if (!message.attachments?.length) return null;

    return (
      <View className="mt-2 space-y-2">
        {message.attachments.map((attachment, index) => (
          <View key={attachment.attachmentId || index} className="rounded-lg overflow-hidden">
            {attachment.type === 'image' || attachment.type === 'plant_photo' ? (
              <NetworkResilientImage
                url={attachment.url}
                thumbnailUrl={attachment.thumbnailUrl}
                width="100%"
                height={200}
                borderRadius={8}
                contentFit="cover"
                optimize={true}
                quality={85}
                enableRetry={true}
                accessibilityLabel={`Image attachment: ${attachment.filename}`}
              />
            ) : (
              <Pressable
                className="flex-row items-center p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
                onPress={() => {
                  haptics.light();
                  // Handle file download/open
                }}
              >
                <OptimizedIcon
                  name="document-text-outline"
                  size={24}
                  className="text-primary-500 mr-3"
                />
                <View className="flex-1">
                  <ThemedText variant="default" className="font-medium">
                    {attachment.filename}
                  </ThemedText>
                  <ThemedText variant="caption" className="text-neutral-500">
                    {(attachment.fileSize / 1024).toFixed(1)} KB
                  </ThemedText>
                </View>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    );
  }, [message.attachments]);

  const renderReactions = useCallback(() => {
    if (!message.reactions?.length) return null;

    // Group reactions by emoji
    const groupedReactions = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji]!.push(reaction);
      return acc;
    }, {} as Record<string, MessageReaction[]>);

    return (
      <View className="flex-row flex-wrap mt-2 gap-1">
        {Object.entries(groupedReactions).map(([emoji, reactions]) => (
          <Pressable
            key={emoji}
            className="flex-row items-center px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full"
            onPress={() => {
              haptics.light();
              onReaction(message.id, emoji);
            }}
          >
            <ThemedText variant="caption">{emoji}</ThemedText>
            <ThemedText variant="caption" className="ml-1 text-neutral-500">
              {reactions.length}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );
  }, [message.reactions, message.id, onReaction]);

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          marginBottom: 8,
          paddingHorizontal: 16,
        },
      ]}
    >
      <Pressable
        {...handlers}
        onLongPress={() => {
          haptics.medium();
          // Show message options (reply, react, copy, etc.)
          Alert.alert(
            'Message Options',
            'What would you like to do?',
            [
              { text: 'Reply', onPress: () => onReply(message) },
              { text: 'React', onPress: () => onReaction(message.id, '👍') },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
        className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${isOwnMessage
            ? 'bg-primary-500 rounded-br-md'
            : 'bg-neutral-200 dark:bg-neutral-700 rounded-bl-md'
            }`}
        >
          {/* Reply indicator */}
          {message.replyTo && (
            <View className="mb-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg">
              <ThemedText variant="caption" className="opacity-70">
                {'Replying to message'}
              </ThemedText>
            </View>
          )}

          {/* Message content */}
          <ThemedText
            variant="default"
            className={isOwnMessage ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}
          >
            {message?.content ?? ''}
          </ThemedText>

          {/* Attachments */}
          {renderAttachments()}

          {/* Reactions */}
          {renderReactions()}

          {/* Message metadata */}
          <View className="flex-row items-center justify-between mt-2">
            <ThemedText
              variant="caption"
              className={`${isOwnMessage ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'
                }`}
            >
              {formatTime(message.sentAt || message.createdAt)}
              {message.isEdited && ' (edited)'}
            </ThemedText>
            {renderMessageStatus()}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

/**
 * Typing Indicator Component
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = React.memo(({ isVisible, userName }) => {
  // Container appearance
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  // Dot pulse shared values
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Fade/scale in container
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });

      // Define a looping pulse sequence from 0 -> 1 -> 0
      const pulse = () =>
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );

      // Staggered delays for each dot
      dot1.value = withDelay(0, pulse());
      dot2.value = withDelay(200, pulse());
      dot3.value = withDelay(400, pulse());
    } else {
      // Fade/scale out container
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });

      // Stop pulsing by resetting to base
      dot1.value = withTiming(0, { duration: 150 });
      dot2.value = withTiming(0, { duration: 150 });
      dot3.value = withTiming(0, { duration: 150 });
    }
  }, [isVisible, opacity, scale, dot1, dot2, dot3]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Map pulse value to scale and opacity for a subtle pulse
  const dotStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + dot1.value * 0.4 }],
    opacity: 0.6 + dot1.value * 0.4,
  }));
  const dotStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + dot2.value * 0.4 }],
    opacity: 0.6 + dot2.value * 0.4,
  }));
  const dotStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + dot3.value * 0.4 }],
    opacity: 0.6 + dot3.value * 0.4,
  }));

  useAnimationCleanup({
    sharedValues: [opacity, scale, dot1, dot2, dot3],
    autoCleanup: true,
  });

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[containerStyle, { paddingHorizontal: 16, marginBottom: 8 }]}
    >
      <View className="flex-row items-center">
        <View className="bg-neutral-200 dark:bg-neutral-700 rounded-2xl rounded-bl-md px-4 py-3">
          <View className="flex-row items-center space-x-1">
            <Animated.View className="w-2 h-2 bg-neutral-400 rounded-full" style={dotStyle1} />
            <Animated.View className="w-2 h-2 bg-neutral-400 rounded-full" style={dotStyle2} />
            <Animated.View className="w-2 h-2 bg-neutral-400 rounded-full" style={dotStyle3} />
          </View>
        </View>
        {userName && (
          <ThemedText variant="caption" className="ml-2 text-neutral-500">
            {userName} is typing...
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
});

/**
 * Online Status Component
 */
const OnlineStatus: React.FC<OnlineStatusProps> = React.memo(({ isOnline, lastSeen }) => {
  const formatLastSeen = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  return (
    <View className="flex-row items-center">
      <View
        className={`w-3 h-3 rounded-full mr-2 ${isOnline ? 'bg-status-success' : 'bg-neutral-400'
          }`}
      />
      <ThemedText variant="caption" className="text-neutral-500">
        {isOnline ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
      </ThemedText>
    </View>
  );
});

/**
 * Message Input Component
 */
const MessageInput: React.FC<MessageInputProps> = React.memo(({
  value,
  onChangeText,
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  replyingTo,
  onCancelReply,
}) => {
  const { animatedStyle: sendButtonStyle, handlers: sendButtonHandlers } = useButtonAnimation({
    pressedScale: 0.9,
    enableHaptics: true,
    hapticStyle: 'medium',
    onPress: onSend,
  });

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* Reply indicator */}
      {replyingTo && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-800">
          <View className="flex-1">
            <ThemedText variant="caption" className="text-primary-500 font-medium">
              {'Replying to'}
            </ThemedText>
            <ThemedText variant="caption" className="text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
              {replyingTo.content}
            </ThemedText>
          </View>
          <Pressable
            onPress={onCancelReply}
            className="p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <OptimizedIcon name="close" size={16} className="text-neutral-500" />
          </Pressable>
        </View>
      )}

      {/* Input area */}
      <View className="flex-row items-end px-4 py-3 space-x-3">
        <View className="flex-1">
          <EnhancedTextInput
            value={value}
            onChangeText={(text) => {
              onChangeText(text);
              onTyping();
            }}
            placeholder={placeholder}
            multiline
            maxLength={2000}
            className="max-h-24 min-h-[40px] bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-2"
            editable={!disabled}
            onSubmitEditing={canSend ? onSend : undefined}
          />
        </View>

        {/* Send button */}
        <Animated.View style={sendButtonStyle}>
          <Pressable
            {...sendButtonHandlers}
            disabled={!canSend}
            className={`w-10 h-10 rounded-full items-center justify-center ${canSend
              ? 'bg-primary-500'
              : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
          >
            <OptimizedIcon
              name="send"
              size={18}
              className={canSend ? 'text-white' : 'text-neutral-500'}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
});

/**
 * Main DirectMessaging Component
 */
export const DirectMessaging: React.FC<DirectMessagingProps> = ({
  conversationId,
  currentUserId,
  otherUserId,
  onClose,
  className = '',
}) => {
  // WatermelonDB
  const { database } = useWatermelon();
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [_isLoading, _setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserPresence, setOtherUserPresence] = useState<UserPresence | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [conversation, setConversation] = useState<ConversationThread | null>(null);

  // Refs
  const flashListRef = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);
  // In React Native, setTimeout returns a number on web and a NodeJS.Timeout in native typings.
  // We store as ReturnType<typeof setTimeout> for cross-platform correctness.
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Safe area insets
  const insets = useSafeAreaInsets();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    };
  }, []);

  // Data fetching - TanStack Query v5
  const {
    data: conversationData,
    isLoading: isConversationLoading,
  } = useQuery({
    queryKey: ['conversation_thread', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('id', conversationId)
        .single();
      if (error) throw error;
      return data as ConversationThread;
    },
    staleTime: 60_000,
  });

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
  } = useQuery({
    queryKey: ['messages', conversationId, { limit: 50 }],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', conversationId)
        .order('sent_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data || []).map((r: MessageRecord) => ({
        id: r.id,
        threadId: r.thread_id,
        senderId: r.sender_id,
        content: r.content,
        messageType: r.message_type,
        attachments: r.attachments ?? [],
        replyTo: r.reply_to ?? undefined,
        reactions: (r.reactions ?? []) as MessageReaction[],
        isEdited: r.is_edited,
        deliveredAt: r.delivered_at ? new Date(r.delivered_at) : undefined,
        readAt: r.read_at ? new Date(r.read_at) : undefined,
        isDeleted: r.is_deleted ?? false,
        lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at) : undefined,
        sentAt: r.sent_at ? new Date(r.sent_at) : undefined,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      })) as Message[];
    },
    staleTime: 10_000,
  });

  const {
    data: presenceData,
    isLoading: isPresenceLoading,
  } = useQuery({
    queryKey: ['user_presence', otherUserId],
    enabled: !!otherUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', otherUserId)
        .single();
      if (error) throw error;
      return data as UserPresence;
    },
    staleTime: 15_000,
  });

  // Sync query results to local component state used elsewhere
  useEffect(() => {
    if (conversationData) setConversation(conversationData);
  }, [conversationData]);

  useEffect(() => {
    if (messagesData) setMessages(messagesData);
  }, [messagesData]);

  useEffect(() => {
    if (presenceData) setOtherUserPresence(presenceData);
  }, [presenceData]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Hold direct subscription handles and fallback cleanup functions.
    let conversationHandle: { unsubscribe?: () => void } | null = null;
    let presenceHandle: { unsubscribe?: () => void } | null = null;
    let conversationCleanup: (() => void) | null = null;
    let presenceCleanup: (() => void) | null = null;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Subscribe to conversation messages
        const convoSubOrFn = await realtimeService.subscribeToConversation(
          conversationId,
          {
            onNewMessage: async (message) => {
              if (isMountedRef.current && isMessageRecord(message)) {
                // Upsert message into WatermelonDB
                await database.write(async () => {
                  const existing = await database.get('messages').find(message.id).catch(() => null);
                  if (existing) {
                    await existing.update((msg: MessageCreateRecord) => {
                      Object.assign(msg, {
                        threadId: message.thread_id,
                        senderId: message.sender_id,
                        content: message.content,
                        messageType: message.message_type,
                        attachments: message.attachments,
                        replyTo: message.reply_to,
                        reactions: message.reactions,
                        isEdited: message.is_edited,
                        deliveredAt: message.delivered_at ? new Date(message.delivered_at) : undefined,
                        readAt: message.read_at ? new Date(message.read_at) : undefined,
                        isDeleted: message.is_deleted,
                        lastSyncedAt: message.last_synced_at ? new Date(message.last_synced_at) : undefined,
                        sentAt: new Date(message.sent_at),
                        createdAt: new Date(message.created_at),
                        updatedAt: new Date(message.updated_at),
                      });
                    });
                  } else {
                    await database.get('messages').create((msg: MessageCreateRecord) => {
                      msg.id = message.id;
                      msg.threadId = message.thread_id;
                      msg.senderId = message.sender_id;
                      msg.content = message.content;
                      msg.messageType = message.message_type;
                      msg.attachments = message.attachments;
                      msg.replyTo = message.reply_to;
                      msg.reactions = message.reactions;
                      msg.isEdited = message.is_edited;
                      msg.deliveredAt = message.delivered_at ? new Date(message.delivered_at) : undefined;
                      msg.readAt = message.read_at ? new Date(message.read_at) : undefined;
                      msg.isDeleted = message.is_deleted;
                      msg.lastSyncedAt = message.last_synced_at ? new Date(message.last_synced_at) : undefined;
                      msg.sentAt = new Date(message.sent_at);
                      msg.createdAt = new Date(message.created_at);
                      msg.updatedAt = new Date(message.updated_at);
                    });
                  }
                });

                // Reload messages from DB
                const updatedMessages = await database.get('messages')
                  .query(
                    Q.where('thread_id', message.thread_id),
                    Q.sortBy('sent_at', Q.asc),
                    Q.take(50)
                  )
                  .fetch();
                setMessages(updatedMessages);

                // Mark as read if not own message
                if (message.sender_id !== currentUserId) {
                  safeAsync(async () => {
                    await supabase
                      .from('messages')
                      .update({ read_at: new Date().toISOString() })
                      .eq('id', message.id);
                  });
                }

                // Scroll to bottom
                setTimeout(() => {
                  flashListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            },
            onMessageUpdate: async (message) => {
              if (isMountedRef.current && isMessageRecord(message)) {
                // Upsert message into WatermelonDB
                await database.write(async () => {
                  const existing = await database.get('messages').find(message.id).catch(() => null);
                  if (existing) {
                    await existing.update((msg: MessageCreateRecord) => {
                      Object.assign(msg, {
                        threadId: message.thread_id,
                        senderId: message.sender_id,
                        content: message.content,
                        messageType: message.message_type,
                        attachments: message.attachments,
                        replyTo: message.reply_to,
                        reactions: message.reactions,
                        isEdited: message.is_edited,
                        deliveredAt: message.delivered_at ? new Date(message.delivered_at) : undefined,
                        readAt: message.read_at ? new Date(message.read_at) : undefined,
                        isDeleted: message.is_deleted,
                        lastSyncedAt: message.last_synced_at ? new Date(message.last_synced_at) : undefined,
                        sentAt: new Date(message.sent_at),
                        createdAt: new Date(message.created_at),
                        updatedAt: new Date(message.updated_at),
                      });
                    });
                  } else {
                    await database.get('messages').create((msg: MessageCreateRecord) => {
                      msg.id = message.id;
                      msg.threadId = message.thread_id;
                      msg.senderId = message.sender_id;
                      msg.content = message.content;
                      msg.messageType = message.message_type;
                      msg.attachments = message.attachments;
                      msg.replyTo = message.reply_to;
                      msg.reactions = message.reactions;
                      msg.isEdited = message.is_edited;
                      msg.deliveredAt = message.delivered_at ? new Date(message.delivered_at) : undefined;
                      msg.readAt = message.read_at ? new Date(message.read_at) : undefined;
                      msg.isDeleted = message.is_deleted;
                      msg.lastSyncedAt = message.last_synced_at ? new Date(message.last_synced_at) : undefined;
                      msg.sentAt = new Date(message.sent_at);
                      msg.createdAt = new Date(message.created_at);
                      msg.updatedAt = new Date(message.updated_at);
                    });
                  }
                });

                // Reload messages from DB
                const updatedMessages = await database.get('messages')
                  .query(
                    Q.where('thread_id', message.thread_id),
                    Q.sortBy('sent_at', Q.asc),
                    Q.take(50)
                  )
                  .fetch();
                setMessages(updatedMessages);
              }
            },
            onTyping: (payload) => {
              const typingPayload = payload.payload as { userId?: string; isTyping?: boolean };
              if (typingPayload?.userId !== currentUserId && isMountedRef.current) {
                setOtherUserTyping(true);

                // Clear typing after 3 seconds
                setTimeout(() => {
                  if (isMountedRef.current) {
                    setOtherUserTyping(false);
                  }
                }, 3000);
              }
            },
            onPresenceChange: (state) => {
              // Handle presence changes
              log.info('[DirectMessaging] Presence changed:', state);
            },
          }
        );

        // Normalize conversation cleanup, prefer direct handle.unsubscribe when available
        if (typeof convoSubOrFn === 'function') {
          conversationCleanup = convoSubOrFn as () => void;
        } else {
          conversationHandle = convoSubOrFn as { unsubscribe?: () => void };
          conversationCleanup = () => {
            try {
              conversationHandle?.unsubscribe?.();
            } catch {
              // Ignore unsubscribe errors
            }
          };
        }

        // Subscribe to other user's presence
        const presenceSubOrFn = await realtimeService.subscribe(
          {
            channelName: `presence:${otherUserId}`,
            table: 'user_presence',
            filter: `user_id=eq.${otherUserId}`,
          },
          {
            onUpdate: (payload) => {
              if (isMountedRef.current) {
                setOtherUserPresence(payload.new as UserPresence);
              }
            },
          }
        );

        // Normalize presence cleanup, prefer direct handle.unsubscribe when available
        if (typeof presenceSubOrFn === 'function') {
          presenceCleanup = presenceSubOrFn as () => void;
        } else {
          presenceHandle = presenceSubOrFn as { unsubscribe?: () => void };
          presenceCleanup = () => {
            try {
              presenceHandle?.unsubscribe?.();
            } catch {
              // Ignore unsubscribe errors
            }
          };
        }

        log.info('[DirectMessaging] Real-time subscriptions established');

      } catch (error) {
        log.error('[DirectMessaging] Error setting up real-time subscriptions:', error);
        globalErrorHandler(error as Error);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions
    return () => {
      try {
        // Prefer direct unsubscribe on handles if available
        if (conversationHandle?.unsubscribe) {
          conversationHandle.unsubscribe();
        } else {
          conversationCleanup?.();
        }
      } catch {
        // Ignore cleanup errors
      }
      try {
        if (presenceHandle?.unsubscribe) {
          presenceHandle.unsubscribe();
        } else {
          presenceCleanup?.();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [conversationId, currentUserId, otherUserId]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    const messageText = inputText.trim();
    if (!messageText || !conversation) return;

    // Clear input immediately for better UX
    setInputText('');
    setReplyingTo(null);

    // Create optimistic message data
    const optimisticMessageData = {
      id: `temp_${Date.now()}`,
      threadId: conversationId,
      senderId: currentUserId,
      content: messageText,
      messageType: 'text',
      attachments: [],
      replyTo: replyingTo?.id,
      reactions: [],
      isEdited: false,
      deliveredAt: undefined,
      readAt: undefined,
      isDeleted: false,
      lastSyncedAt: undefined,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      // Mock the computed properties and methods for UI display
      isTextMessage: true,
      hasAttachments: false,
      isReply: !!replyingTo?.id,
      hasReactions: false,
      reactionCount: 0,
    };

    try {
      // Add optimistic message to UI - we'll cast it for display purposes
      setMessages(prev => [...prev, optimisticMessageData as unknown as Message]);

      // Scroll to bottom
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send message to database
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          thread_id: conversationId,
          sender_id: currentUserId,
          content: messageText,
          message_type: 'text',
          reply_to: replyingTo?.id,
          is_edited: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Replace optimistic message with real message
      if (isMountedRef.current) {
        setMessages(prev =>
          prev.map(m => m.id === optimisticMessageData.id ? newMessage : m)
        );
      }

      // Update conversation's last message
      await supabase
        .from('conversation_threads')
        .update({
          last_message_id: newMessage.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Broadcast message via real-time
      await realtimeService.broadcast(`conversation:${conversationId}`, {
        type: 'message',
        payload: newMessage,
        userId: currentUserId,
        timestamp: Date.now(),
      });

      // Haptic feedback for successful send
      haptics.success();

    } catch (error) {
      log.error('[DirectMessaging] Error sending message:', error);
      globalErrorHandler(error as Error);

      // Remove optimistic message on error
      if (isMountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessageData.id));
      }

      // Show error feedback
      haptics.error();
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [inputText, conversation, conversationId, currentUserId, replyingTo]);

  // Handle typing indicator (throttled)
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);

      // Broadcast typing indicator
      safeAsync(async () => {
        await realtimeService.broadcast(`conversation:${conversationId}`, {
          type: 'typing',
          payload: { userId: currentUserId, isTyping: true },
          userId: currentUserId,
          timestamp: Date.now(),
        });
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

  // Set new timeout to stop typing indicator
  typingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsTyping(false);

        // Broadcast stop typing
        safeAsync(async () => {
          await realtimeService.broadcast(`conversation:${conversationId}`, {
            type: 'typing',
            payload: { userId: currentUserId, isTyping: false },
            userId: currentUserId,
            timestamp: Date.now(),
          });
        });
      }
    }, 2000);
  }, [isTyping, conversationId, currentUserId]);

  // Debounce handleTyping to avoid excessive broadcasts (replaces custom throttle)
  const throttledHandleTyping = useDebouncedCallback(handleTyping, 1500);

  // Handle message reactions
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      haptics.light();

      // Check if user already reacted with this emoji
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const existingReaction = message.reactions?.find(
        r => r.userId === currentUserId && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        const updatedReactions = message.reactions?.filter(
          r => !(r.userId === currentUserId && r.emoji === emoji)
        ) || [];

        // Update local state
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, reactions: updatedReactions } as Message
              : m
          )
        );

        // Update database
        await supabase
          .from('messages')
          .update({ reactions: updatedReactions })
          .eq('id', messageId);
      } else {
        // Add reaction
        const newReaction = {
          userId: currentUserId,
          emoji,
          reactedAt: new Date(),
        };

        const updatedReactions = [...(message.reactions || []), newReaction];

        // Update local state
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, reactions: updatedReactions } as Message
              : m
          )
        );

        // Update database
        await supabase
          .from('messages')
          .update({ reactions: updatedReactions })
          .eq('id', messageId);
      }

    } catch (error) {
      log.error('[DirectMessaging] Error handling reaction:', error);
      globalErrorHandler(error as Error);
    }
  }, [messages, currentUserId]);

  // Handle message reply
  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
    haptics.light();
  }, []);

  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    haptics.light();
  }, []);

  // Render message item for FlashList
  const renderMessage = useCallback(({ item: message, index }: { item: Message; index: number }) => {
    const isOwnMessage = message.senderId === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const messageTime = message.sentAt || message.createdAt;
    const prevMessageTime = previousMessage?.sentAt || previousMessage?.createdAt;
    const showAvatar = !isOwnMessage && (
      !previousMessage ||
      previousMessage.senderId !== message.senderId ||
      (messageTime && prevMessageTime && (new Date(messageTime).getTime() - new Date(prevMessageTime).getTime()) > 300000) // 5 minutes
    );

    return (
      <MessageBubble
        message={message}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar || false}
        onReaction={handleReaction}
        onReply={handleReply}
      />
    );
  }, [messages, currentUserId, handleReaction, handleReply]);

  // Memoized message list
  const messageList = useMemo(() => messages, [messages]);

  if (isConversationLoading || isMessagesLoading || isPresenceLoading) {
    return (
      <ThemedView className={`flex-1 items-center justify-center ${className}`}>
        <ThemedText variant="default" className="text-neutral-500">
          Loading conversation...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <EnhancedKeyboardWrapper className={`flex-1 ${className}`}>
      <ThemedView className="flex-1">
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          style={{ paddingTop: Math.max(insets.top, 12) }}
        >
          <View className="flex-row items-center flex-1">
            {onClose && (
              <Pressable
                onPress={onClose}
                className="mr-3 p-2 -ml-2"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <OptimizedIcon name="arrow-back" size={24} className="text-neutral-700 dark:text-neutral-300" />
              </Pressable>
            )}

            <View className="flex-1">
              <ThemedText variant="heading" className="font-semibold">
                {conversation?.name || 'Direct Message'}
              </ThemedText>
            {otherUserPresence && (
              <OnlineStatus
                isOnline={otherUserPresence.isOnline}
                lastSeen={otherUserPresence.lastSeen ? new Date(String(otherUserPresence.lastSeen)) : undefined}
              />
            )}
            </View>
          </View>
        </View>

        {/* Messages */}
        <View className="flex-1">
          <FlashListWrapper
            data={messageList}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
            // iOS-only maintainVisibleContentPosition; Android uses wrapper's bottom-pinning fallback
            maintainVisibleContentPosition={
              Platform.OS === 'ios'
                ? {
                    autoscrollToBottomThreshold: 0.2,
                    startRenderingFromBottom: true,
                  }
                : undefined
            }
            stickyToBottomOnAndroid
            onContentSizeChange={() => {
              // Auto-scroll to bottom when new messages arrive
              setTimeout(() => {
                flashListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />

          {/* Typing indicator */}
          <TypingIndicator
            isVisible={otherUserTyping}
            userName={otherUserPresence?.presenceData?.customStatus}
          />
        </View>

        {/* Message input */}
        <MessageInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSendMessage}
          onTyping={throttledHandleTyping}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </ThemedView>
    </EnhancedKeyboardWrapper>
  );
};

const WrappedDirectMessaging: React.FC<DirectMessagingProps> = (props) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset: _reset }) => (
        <ErrorBoundary>
          <DirectMessaging {...props} />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

export default WrappedDirectMessaging;
