import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { useTheme } from '../../lib/contexts/ThemeContext';

export default function CommunityScreen() {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.neutral[50] }}>
      <ThemedView className="flex-1 justify-center items-center p-4">
        <ThemedText className="text-xl font-bold">Community Screen</ThemedText>
        <ThemedText className="mt-2" lightClassName="text-neutral-500" darkClassName="text-neutral-400">Coming soon</ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}
