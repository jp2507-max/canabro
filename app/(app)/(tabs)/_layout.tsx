import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
  NativeBottomTabNavigationOptions,
  NativeBottomTabNavigationEventMap,
} from '@bottom-tabs/react-navigation';
import { ImageSourcePropType } from 'react-native';
import type { AppleIcon } from 'react-native-bottom-tabs';
import React, { useEffect, useState } from 'react';

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

// Simple delayed tabs wrapper to ensure Expo Router context is ready
const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  any,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

type TabBarIconFunction = (props: { focused: boolean }) => ImageSourcePropType | AppleIcon;

const baseScreenOptions = {
  headerShown: false,
} as any;

// Helper function to create properly typed tab bar icons with focus support
const createTabBarIcon = (sfSymbol: string): TabBarIconFunction => {
  return ({ focused }) => {
    try {
      return {
        sfSymbol: focused ? `${sfSymbol}.fill` : sfSymbol,
      } as AppleIcon;
    } catch (error) {
      console.error('[TabsLayout] Error creating tab bar icon:', error);
      // Fallback icon
      return {
        sfSymbol: 'house',
      } as AppleIcon;
    }
  };
};

// Simple delay component to let navigation context initialize
const DelayedTabs: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Give Expo Router time to initialize navigation context
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isReady) {
    return null; // Brief loading state
  }
  
  return (
    <Tabs initialRouteName="index" screenOptions={baseScreenOptions}>
      <Tabs.Screen
        name="strains"
        options={{
          title: 'Strains',
          tabBarIcon: createTabBarIcon('leaf'),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: createTabBarIcon('house'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: createTabBarIcon('calendar'),
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: 'Diagnosis',
          tabBarIcon: createTabBarIcon('stethoscope'),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: createTabBarIcon('person.3'),
        }}
      />
    </Tabs>
  );
};

export default function TabsLayout() {
  try {
    return <DelayedTabs />;
  } catch (error) {
    console.error('[TabsLayout] Critical error in tabs layout:', error);
    // This should rarely happen, but if it does, we can't render tabs
    throw error;
  }
}
