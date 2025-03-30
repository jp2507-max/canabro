import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import { View, ActivityIndicator, Pressable } from 'react-native';

export default function TabsLayout() {
  const router = useRouter();
  // Protect all tab routes
  const { isLoading } = useProtectedRoute();

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a', // green-600
        tabBarInactiveTintColor: '#6b7280', // gray-500
      }}
      initialRouteName="strains" // Set strains as the initial screen
    >
      <Tabs.Screen
        name="strains"
        options={{
          title: 'Strains',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')} className="mr-4">
              {({ pressed }) => (
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="#6b7280" // gray-500
                  style={{ opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: 'Diagnosis',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
