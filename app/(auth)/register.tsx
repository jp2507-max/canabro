import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import { Container } from '../../components/Container';
import { useAuth } from '../../lib/contexts/AuthProvider';
import supabase from '../../lib/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    // Form validation
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Register user with Supabase auth
      const { error, data } = await signUp(email, password);

      if (error) {
        Alert.alert('Registration Failed', error.message);
        return;
      }

      // If registration is successful, create a profile record
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          email,
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          Alert.alert(
            'Profile Creation Failed',
            'Your account was created but we could not set up your profile. Please contact support.'
          );
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <View className="flex-1 justify-center px-6">
        <Text className="mb-8 text-center text-3xl font-bold">CanaBro</Text>
        <Text className="mb-6 text-center text-xl font-semibold">Create Account</Text>

        <View className="mb-6 space-y-4">
          <TextInput
            className="rounded-lg bg-gray-100 p-4"
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isLoading}
          />

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
          onPress={handleRegister}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center font-semibold text-white">Register</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text className="font-semibold text-green-600">Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </Container>
  );
}
