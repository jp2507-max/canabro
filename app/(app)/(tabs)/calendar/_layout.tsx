import { Stack } from 'expo-router';

export default function CalendarLayout() {
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
          headerTitle: 'Add Task',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-plant-task"
        options={{
          headerShown: true,
          headerTitle: 'Add Plant Task',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
