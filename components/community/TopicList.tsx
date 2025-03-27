import React from 'react';
import { ScrollView } from 'react-native';
import TopicTag from './TopicTag';
import ThemedView from '../ui/ThemedView';

type TopicListProps = {
  topics: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  activeTopic: string | null;
  onTopicPress: (topicId: string) => void;
};

/**
 * Horizontal scrollable list of topic tags
 */
export default function TopicList({ topics, activeTopic, onTopicPress }: TopicListProps) {
  return (
    <ThemedView className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {topics.map((topic) => (
          <TopicTag
            key={topic.id}
            name={topic.name}
            count={topic.count}
            isActive={activeTopic === topic.id}
            onPress={() => onTopicPress(topic.id)}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}
