import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
  NativeBottomTabNavigationOptions,
  NativeBottomTabNavigationEventMap,
} from '@bottom-tabs/react-navigation';
import { ImageSourcePropType } from 'react-native';
import type { AppleIcon } from 'react-native-bottom-tabs';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Create the native bottom tab navigator and wrap it with Expo Router context
const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  never,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

// Typing helper for SF Symbol icons
type TabBarIconFunction = (props: { focused: boolean }) => ImageSourcePropType | AppleIcon;

const baseScreenOptions = {
  headerShown: false,
} as NativeBottomTabNavigationOptions;

// Utility to return an AppleIcon (sfSymbol) that changes based on focus state
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

export default function TabsLayout() {
  const { t } = useTranslation('navigation');

  /*  DEBUG: track unexpected unmounts  */
  useEffect(() => {
    console.log('[RootLayout] mounted');
    return () => console.log('[RootLayout] *** UNMOUNTED ***');
  }, []);

  try {
    return (
      <Tabs initialRouteName="index" screenOptions={baseScreenOptions}>
        <Tabs.Screen
          name="strains"
          options={{
            title: t('tabs.strains'),
            tabBarIcon: createTabBarIcon('leaf'),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: createTabBarIcon('house'),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: t('tabs.calendar'),
            tabBarIcon: createTabBarIcon('calendar'),
          }}
        />
        <Tabs.Screen
          name="diagnosis"
          options={{
            title: t('tabs.diagnosis'),
            tabBarIcon: createTabBarIcon('stethoscope'),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: t('tabs.community'),
            tabBarIcon: createTabBarIcon('person.3'),
          }}
        />
      </Tabs>
    );
  } catch (error) {
    console.error('[TabsLayout] Critical error in tabs layout:', error);
    throw error;
  }
}
