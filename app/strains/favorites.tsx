import { Stack } from 'expo-router';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FavoriteStrainsScreen } from '@/screens/strains/FavoriteStrainsScreen';

export default function FavoritesStrainsRoute() {
  return (
    <ErrorBoundary>
      {/* Hide the header entirely to match the main strains tab */}
      <Stack.Screen options={{ headerShown: false }} />
      <FavoriteStrainsScreen />
    </ErrorBoundary>
  );
}
