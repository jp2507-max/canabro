/**
 * Plant Search Screen Route
 */
import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PlantSearchScreen } from '@/screens/PlantSearchScreen';

export default function SearchRoute() {
  const { t } = useTranslation('plantSearch');
  
  return (
    <>
      <Stack.Screen
        options={{
          title: t('title'),
          headerLargeTitle: true,
        }}
      />
      <PlantSearchScreen />
    </>
  );
}