import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator, Pressable } from 'react-native'; // Keep Pressable

// Import useAuth and UserAvatar
import { useAuth } from '../../lib/contexts/AuthProvider';
import UserAvatar from '../../components/community/UserAvatar'; // Adjust path if needed
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';


export default function TabsLayout() {
  const router = useRouter();
  // Protect all tab routes
  const { isLoading } = useProtectedRoute();

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a', // green-600
        tabBarInactiveTintColor: '#6b7280', // gray-500
        headerShown: false, // Hide the default header globally
      }}
      initialRouteName="strains" // Set strains as the initial screen
    >
      <Tabs.Screen
        name="strains"
        options={{
          title: 'Strains',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          // title: 'Home', // Title is hidden by headerShown: false
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          // headerRight is removed as header is hidden
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: 'Diagnosis',
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          // title: 'Community', // Title is hidden by headerShown: false
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          // headerRight is removed as header is hidden
        }}
      />
    </Tabs>
  );
}
