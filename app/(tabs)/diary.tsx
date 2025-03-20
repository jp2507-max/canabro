import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DiaryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-xl font-semibold">Diary Screen</Text>
        <Text className="text-gray-500 mt-2">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
