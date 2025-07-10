import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

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
