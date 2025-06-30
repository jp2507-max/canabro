import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/contexts/AuthProvider';

export default function AppLayout() {
  const { user, loading } = useAuth();
  // Show loading state while checking auth
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Render protected content
  return <Stack screenOptions={{ headerShown: false }} />;
}
