import { FavoriteStrainsScreen } from '@/screens/strains/FavoriteStrainsScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Stack } from 'expo-router';

export default function FavoritesStrainsRoute() {
  return (
    <ErrorBoundary>
      {/* Hide the header entirely to match the main strains tab */}
      <Stack.Screen options={{ headerShown: false }} />
      <FavoriteStrainsScreen />
    </ErrorBoundary>
  );
}
