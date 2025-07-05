import { Stack } from 'expo-router';

export default function AppLayout() {
  // Authentication is now handled in the main index.tsx
  // This layout only renders for authenticated users
  return <Stack screenOptions={{ headerShown: false }} />;
}
