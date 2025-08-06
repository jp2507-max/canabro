/**
 * Messaging Components Index
 * 
 * Exports all messaging-related components for the Advanced Community Features
 */

export { DirectMessaging } from './DirectMessaging';
export { MessageComposer } from './MessageComposer';
export { MessageComposerDemo } from './MessageComposerDemo';

// Export types for external use
export type {
  DirectMessagingProps,
  MessageBubbleProps,
  TypingIndicatorProps,
  OnlineStatusProps,
  MessageInputProps,
} from './DirectMessaging';

export type {
  MessageComposerProps,
  ComposerMessage,
  MessageAttachment,
  MessageMention,
  MessageFormatting,
  VoiceMessage,
} from './MessageComposer';