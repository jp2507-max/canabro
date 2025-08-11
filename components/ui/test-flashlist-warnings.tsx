/**
 * Test component to verify FlashList migration warnings work
 * This component intentionally uses deprecated props to trigger warnings
 */

import React from 'react';
import { FlashListWrapper } from './FlashListWrapper';
import { Text } from 'react-native';

// Test data
const testData = [
  { id: '1', title: 'Item 1' },
  { id: '2', title: 'Item 2' },
  { id: '3', title: 'Item 3' },
];

const renderItem = ({ item }: { item: { id: string; title: string } }) => (
  <Text>{item.title}</Text>
);

export function TestFlashListWarnings() {
  console.log('🧪 Rendering TestFlashListWarnings component with deprecated props...');
  
  return (
    <FlashListWrapper
      data={testData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      // These props previously triggered warnings in v1.
      // In v2, remove deprecated/unsupported props to satisfy TS types.
      // Migration equivalents (if needed):
      // - inverted => maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
      // - onBlankArea => no replacement (removed in v2)
      // - disableAutoLayout => removed in v2
      maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
    />
  );
}

export default TestFlashListWarnings;
