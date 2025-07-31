/**
 * MessageComposer Demo Component
 * 
 * A simple demo component to test the MessageComposer functionality
 */

import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { MessageComposer, ComposerMessage } from './MessageComposer';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { Logger } from '@/lib/utils/production-utils';

export const MessageComposerDemo: React.FC = () => {
  const [messages, setMessages] = useState<ComposerMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  const handleSendMessage = (message: ComposerMessage) => {
    Logger.info('Message sent', { message });
    setMessages(prev => [...prev, message]);
  };

  const handleTextChange = (text: string) => {
    setCurrentMessage(text);
  };

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <View className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <ThemedText variant="heading" className="font-semibold">
          MessageComposer Demo
        </ThemedText>
        <ThemedText variant="caption" className="text-neutral-500 mt-1">
          Test the rich message composer functionality
        </ThemedText>
      </View>

      {/* Messages Display */}
      <ScrollView className="flex-1 p-4">
        {messages.length === 0 ? (
          <View className="items-center justify-center py-8">
            <ThemedText variant="default" className="text-neutral-500">
              No messages yet. Try sending one below!
            </ThemedText>
          </View>
        ) : (
          messages.map((message, index) => (
            <View key={index} className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              {/* Message Text */}
              {message.text && (
                <ThemedText variant="default" className="mb-2">
                  {message.text}
                </ThemedText>
              )}

              {/* Attachments */}
              {message.attachments.length > 0 && (
                <View className="mb-2">
                  <ThemedText variant="caption" className="text-neutral-500 mb-1">
                    Attachments ({message.attachments.length}):
                  </ThemedText>
                  {message.attachments.map((attachment, idx) => (
                    <ThemedText key={idx} variant="caption" className="text-primary-500">
                      • {attachment.filename} ({attachment.type})
                    </ThemedText>
                  ))}
                </View>
              )}

              {/* Voice Message */}
              {message.voiceMessage && (
                <View className="mb-2">
                  <ThemedText variant="caption" className="text-neutral-500">
                    Voice message: {message.voiceMessage.duration}s
                  </ThemedText>
                </View>
              )}

              {/* Mentions */}
              {message.mentions.length > 0 && (
                <View className="mb-2">
                  <ThemedText variant="caption" className="text-neutral-500">
                    Mentions: {message.mentions.map(m => m.username).join(', ')}
                  </ThemedText>
                </View>
              )}

              {/* Formatting */}
              {message.formatting.length > 0 && (
                <View>
                  <ThemedText variant="caption" className="text-neutral-500">
                    Formatting: {message.formatting.map(f => f.type).join(', ')}
                  </ThemedText>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* MessageComposer */}
      <MessageComposer
        value={currentMessage}
        onChangeText={handleTextChange}
        onSend={handleSendMessage}
        onTypingStart={() => console.log('Typing started')}
        onTypingStop={() => console.log('Typing stopped')}
        placeholder="Type your message here..."
        enableAttachments={true}
        enableEmojis={true}
        enableVoiceMessages={true}
        enableFormatting={true}
        userId="demo-user-123"
        conversationId="demo-conversation"
        attachmentBucket="community-questions"
      />
    </ThemedView>
  );
};

export default MessageComposerDemo;
