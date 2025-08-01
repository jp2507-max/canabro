import React from 'react';
import { View } from 'react-native';
import ThemedText from '@/components/ui/ThemedText';
import type { ViolationType } from '@/lib/services/content-moderation.service';

interface ViolationTypeItemProps {
  type: ViolationType;
  count: number;
  total: number;
}

const ViolationTypeItem: React.FC<ViolationTypeItemProps> = ({ type, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">
          {type.replace('_', ' ')}
        </ThemedText>
        <View className="flex-row items-center mt-1">
          <View className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full mr-3">
            <View
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </View>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {percentage.toFixed(1)}%
          </ThemedText>
        </View>
      </View>
      <ThemedText className="text-sm font-bold text-neutral-900 dark:text-white ml-4">
        {count}
      </ThemedText>
    </View>
  );
};

export default ViolationTypeItem;
