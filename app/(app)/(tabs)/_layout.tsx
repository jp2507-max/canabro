import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
  NativeBottomTabNavigationOptions,
  NativeBottomTabNavigationEventMap,
} from '@bottom-tabs/react-navigation';
import { ImageSourcePropType } from 'react-native';
import type { AppleIcon } from 'react-native-bottom-tabs';

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  any,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

type TabBarIconFunction = (props: { focused: boolean }) => ImageSourcePropType | AppleIcon;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseScreenOptions = {
  headerShown: false,
} as any;

// Helper function to create properly typed tab bar icons with focus support
const createTabBarIcon = (sfSymbol: string): TabBarIconFunction => {
  return ({ focused }) => ({ 
    sfSymbol: (focused ? `${sfSymbol}.fill` : sfSymbol)
  } as AppleIcon);
};

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={baseScreenOptions}
    >
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
}
