import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Defines the navigation stack layout for the calendar section, configuring screen headers and titles with internationalization support.
 *
 * The layout includes three screens: the main calendar view, an add-task modal, and an add-plant-task modal. Header titles for modals are translated using the 'navigation' namespace.
 *
 * @returns The configured calendar stack layout as a React element.
 */
export default function CalendarLayout() {
  const { t } = useTranslation('navigation');
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add-task"
        options={{
          headerShown: true,
          headerTitle: t('headers.addTask'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-plant-task"
        options={{
          headerShown: true,
          headerTitle: t('headers.addPlantTask'),
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
