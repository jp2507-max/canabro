import { View } from 'react-native';
import { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DevModeIndicator } from './DevModeIndicator';
import { isDevelopment } from '../lib/config';

interface ContainerProps {
  children: ReactNode;
  showDevInfo?: boolean;
}

export function Container({ children, showDevInfo = false }: ContainerProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-white">
          <StatusBar style="auto" />
          {children}
          {isDevelopment && <DevModeIndicator showFullDetails={showDevInfo} />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = {
  container: 'flex flex-1 m-6',
};
