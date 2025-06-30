import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../lib/contexts/AuthProvider';

export default function AuthLayout() {
  const { user } = useAuth();

  // If already authenticated, send away from auth screens
  if (user) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
