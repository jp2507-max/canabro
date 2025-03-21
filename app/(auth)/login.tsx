import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Container } from '../../components/Container';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { isDevelopment, authConfig } from '../../lib/config';

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
        <Text className="text-3xl font-bold mb-8 text-center">CanaBro</Text>
        <Text className="text-xl font-semibold mb-6 text-center">Login</Text>
        
        {isDevelopment && (
          <View className="mb-4 p-3 bg-yellow-100 rounded-lg">
            <Text className="text-yellow-800 text-center text-sm">
              {authConfig.forceDevBypass 
                ? 'Development mode: Auto-login is enabled' 
                : 'Development mode: Manual login required'}
            </Text>
          </View>
        )}
        
        <View className="space-y-4 mb-6">
          <TextInput
            className="bg-gray-100 p-4 rounded-lg"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />
          
          <TextInput
            className="bg-gray-100 p-4 rounded-lg"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>
        
        <TouchableOpacity 
          className={`bg-green-600 p-4 rounded-lg mb-4 ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">Login</Text>
          )}
        </TouchableOpacity>
        
        {showDevOptions && (
          <TouchableOpacity 
            className="bg-blue-600 p-4 rounded-lg mb-4"
            onPress={handleDevBypass}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-semibold">Dev Mode Login</Text>
          </TouchableOpacity>
        )}
        
        <View className="flex-row justify-center">
          <Text className="text-gray-600">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text className="text-green-600 font-semibold">Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </Container>
  );
}
