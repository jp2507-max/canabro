import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Authentication routing is now handled in the main index.tsx
  // This layout only renders for unauthenticated users
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
