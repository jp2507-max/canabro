import { View, ActivityIndicator } from 'react-native';
import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
  NativeBottomTabNavigationOptions,
  NativeBottomTabNavigationEventMap,
} from '@bottom-tabs/react-navigation';

import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  any,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

export default function TabsLayout() {
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
      initialRouteName="strains" // Set strains as the initial screen
    >
      <Tabs.Screen
        name="strains"
        options={{
          title: 'Strains',
          tabBarIcon: () => ({ sfSymbol: 'leaf' }),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: () => ({ sfSymbol: 'house' }),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: () => ({ sfSymbol: 'calendar' }),
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: 'Diagnosis',
          tabBarIcon: () => ({ sfSymbol: 'stethoscope' }),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: () => ({ sfSymbol: 'person.3' }),
        }}
      />
    </Tabs>
  );
}
