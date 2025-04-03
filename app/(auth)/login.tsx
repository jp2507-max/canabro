import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import { Container } from '../../components/Container';
import { isDevelopment, authConfig } from '../../lib/config';
import { useAuth } from '../../lib/contexts/AuthProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, devBypassAuth } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert('Login Failed', error.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setIsLoading(true);
    try {
      const { error } = await devBypassAuth();
      if (error) {
        Alert.alert('Dev Bypass Failed', error.message);
      }
    } catch (error) {
      console.error('Dev bypass error:', error);
      Alert.alert('Dev Bypass Failed', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if we're in development mode
  const showDevOptions = isDevelopment && !authConfig.forceDevBypass;

  return (
    <Container>
      <View className="flex-1 justify-center px-6">
        <Text className="mb-8 text-center text-3xl font-bold">CanaBro</Text>
        <Text className="mb-6 text-center text-xl font-semibold">Login</Text>

        {isDevelopment && (
          <View className="mb-4 rounded-lg bg-yellow-100 p-3">
            <Text className="text-center text-sm text-yellow-800">
              {authConfig.forceDevBypass
                ? 'Development mode: Auto-login is enabled'
                : 'Development mode: Manual login required'}
            </Text>
          </View>
        )}

        <View className="mb-6 space-y-4">
          <TextInput
            className="rounded-lg bg-gray-100 p-4"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />

          <TextInput
            className="rounded-lg bg-gray-100 p-4"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          className={`mb-4 rounded-lg bg-green-600 p-4 ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center font-semibold text-white">Login</Text>
          )}
        </TouchableOpacity>

        {showDevOptions && (
          <TouchableOpacity
            className="mb-4 rounded-lg bg-blue-600 p-4"
            onPress={handleDevBypass}
            disabled={isLoading}>
            <Text className="text-center font-semibold text-white">Dev Mode Login</Text>
          </TouchableOpacity>
        )}

        <View className="flex-row justify-center">
          <Text className="text-gray-600">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text className="font-semibold text-green-600">Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </Container>
  );
}
