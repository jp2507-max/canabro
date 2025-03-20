import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="plant/[id]" 
          options={{ 
            title: 'Plant Details',
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
